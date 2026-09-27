import { NextResponse } from "next/server";
import { z } from "zod";
import type { Address } from "viem";
import { roleFor } from "@/lib/access";
import { alertProtector } from "@/lib/notify";
import { decide, servConfigured } from "@/lib/serv";
import { enforce, spentThisYear } from "@/lib/rules";
import { getTrust, newId, saveRequest } from "@/lib/store";
import { trustState } from "@/lib/trust-state";
import type { TrustRequest } from "@/lib/types";
import { payUsdc } from "@/lib/wallet";

export const maxDuration = 120;

const Body = z.object({
  beneficiaryId: z.string(),
  amount: z.coerce.number().positive().max(1_000_000),
  reason: z.string().min(3).max(2000),
  evidence: z.string().max(6000).default(""),
  key: z.string().max(100).optional(),
});

export async function POST(req: Request, ctx: RouteContext<"/api/trusts/[id]/requests">) {
  const { id } = await ctx.params;
  const trust = await getTrust(id);
  if (!trust) return NextResponse.json({ error: "This trust doesn't exist." }, { status: 404 });
  if (!servConfigured()) return NextResponse.json({ error: "The trustee is not connected yet." }, { status: 503 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Say how much and what it's for." }, { status: 400 });
  const body = parsed.data;
  // Only a named person, through their own private link, can ask as themselves.
  const role = roleFor(trust, body.key);
  const who =
    role.kind === "beneficiary"
      ? role.person
      : role.kind === "legacy"
        ? trust.beneficiaries.find((b) => b.id === body.beneficiaryId)
        : undefined;
  if (!who)
    return NextResponse.json(
      { error: role.kind === "public" ? "Use your own private link to ask the trustee." : "That person isn't named in this trust." },
      { status: 403 },
    );

  const state = await trustState(trust);
  const spent = spentThisYear(state.requests, who.id);
  const started = Date.now();

  let result;
  try {
    result = await decide(trust, {
      beneficiaryName: who.name,
      amount: body.amount,
      reason: body.reason,
      evidence: body.evidence,
      spentThisYear: spent,
      yearlyCap: who.yearlyCap,
      spendable: state.spendable,
      today: new Date().toISOString().slice(0, 10),
    });
  } catch (e) {
    return NextResponse.json({ error: `The trustee couldn't decide right now: ${(e as Error).message}` }, { status: 502 });
  }

  const { final, amount, checks } = enforce({
    trust,
    beneficiary: who,
    asked: body.amount,
    decision: result.decision,
    spent,
    spendable: state.spendable,
    paused: Boolean(trust.paused),
  });

  const record: TrustRequest = {
    id: newId(),
    trustId: trust.id,
    beneficiaryId: who.id,
    amount: body.amount,
    reason: body.reason,
    evidence: body.evidence,
    createdAt: new Date().toISOString(),
    decision: result.decision,
    checks,
    final,
    paid: 0,
    model: result.model,
    latencyMs: Date.now() - started,
  };

  if ((final === "approve" || final === "partial") && amount > 0 && who.wallet) {
    try {
      record.payoutTx = await payUsdc(trust.id, who.wallet as Address, amount);
      record.paid = amount;
    } catch (e) {
      record.payoutError = (e as Error).message;
    }
  }

  if (result.decision.flagged) record.protectorAlerted = await alertProtector(trust, record, who.name, new URL(req.url).origin);

  await saveRequest(record);
  return NextResponse.json(record);
}
