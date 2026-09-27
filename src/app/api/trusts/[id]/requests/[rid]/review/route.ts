import { NextResponse } from "next/server";
import { z } from "zod";
import type { Address } from "viem";
import { canPause, roleFor } from "@/lib/access";
import { oneAtATime } from "@/lib/queue";
import { enforce, spentThisYear } from "@/lib/rules";
import { getRequest, getTrust, saveRequest } from "@/lib/store";
import { trustState } from "@/lib/trust-state";
import { payUsdc } from "@/lib/wallet";

export const maxDuration = 120;

const Body = z.object({ key: z.string().max(100).optional(), approve: z.boolean() });

// The protector (or settlor) rules on a payment the fixed rules held back.
// Approving re-checks every limit against today's balance before paying.
export async function POST(req: Request, ctx: RouteContext<"/api/trusts/[id]/requests/[rid]/review">) {
  const { id, rid } = await ctx.params;
  const trust = await getTrust(id);
  if (!trust) return NextResponse.json({ error: "This trust doesn't exist." }, { status: 404 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Approve or decline." }, { status: 400 });
  const role = roleFor(trust, parsed.data.key);
  if (!canPause(role))
    return NextResponse.json({ error: "Only the protector or settlor can review." }, { status: 403 });
  return oneAtATime(trust.id, async () => {
    // Read the trust again inside the queue, so a pause made a moment ago counts.
    const t = (await getTrust(trust.id)) ?? trust;
    const record = await getRequest(trust.id, rid);
    if (!record?.review || record.review.status !== "pending" || !record.decision)
      return NextResponse.json({ error: "This request isn't waiting for review." }, { status: 409 });

    const by = role.kind === "protector" ? "protector" : "settlor";
    const at = new Date().toISOString();

    if (!parsed.data.approve) {
      record.review = { ...record.review, status: "declined", by, at };
      record.final = "decline";
      await saveRequest(record);
      return NextResponse.json(record);
    }

    if (t.paused) return NextResponse.json({ error: "Resume payouts first." }, { status: 409 });
    const who = t.beneficiaries.find((b) => b.id === record.beneficiaryId);
    if (!who) return NextResponse.json({ error: "That person is no longer in this trust." }, { status: 409 });

    const state = await trustState(t);
    const spent = spentThisYear(state.requests, who.id);
    const { final, amount, checks } = enforce({
      trust: t,
      beneficiary: who,
      asked: record.amount,
      decision: { ...record.decision, verdict: "approve", amount: record.review.amount, flagged: false },
      spent,
      spendable: state.spendable,
      reviewed: true,
    });
    record.review = { ...record.review, status: "approved", by, at };
    record.checks = [
      ...(record.checks ?? []),
      { rule: `Reviewed by the ${by}`, passed: true, note: "Approved after review; limits checked again" },
      ...checks.filter((c) => !c.passed),
    ];
    record.final = final;
    if (amount > 0 && who.wallet) {
      try {
        record.payoutTx = await payUsdc(t.id, who.wallet as Address, amount);
        record.paid = amount;
        delete record.payoutError;
      } catch (e) {
        record.payoutError = (e as Error).message;
        // Still owed: leave it waiting so it can be approved again.
        record.review = { ...record.review, status: "pending", reason: "The payment didn't go through." };
      }
    }
    await saveRequest(record);
    return NextResponse.json(record);
  });
}
