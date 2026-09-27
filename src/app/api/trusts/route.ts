import { NextResponse } from "next/server";
import { z } from "zod";
import { isAddress } from "viem";
import { newKey } from "@/lib/access";
import { newId, saveTrust } from "@/lib/store";
import { currentBlock, trustAddress } from "@/lib/wallet";
import type { Trust } from "@/lib/types";

const Body = z.object({
  name: z.string().min(2).max(80),
  settlor: z.string().min(1).max(80),
  protector: z.string().max(80).optional(),
  protectorEmail: z.string().email().max(120).optional().or(z.literal("")),
  deed: z.string().min(40).max(8000),
  perRequestMax: z.coerce.number().positive(),
  liquidBuffer: z.coerce.number().min(0).default(0),
  beneficiaries: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        relation: z.string().max(60).default(""),
        wallet: z.string().optional(),
        yearlyCap: z.coerce.number().positive(),
      }),
    )
    .min(1)
    .max(10),
  check: z.any().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    const hint: Record<string, string> = {
      name: "Give the trust a name.",
      settlor: "Add your name.",
      deed: "Write at least a few sentences of wishes.",
      perRequestMax: "Set the largest single payment.",
      protectorEmail: "The protector's email doesn't look right.",
      beneficiaries: "Each person needs a name and a yearly limit above zero.",
    };
    return NextResponse.json({ error: hint[field] ?? "Some details are missing or not valid." }, { status: 400 });
  }
  const b = parsed.data;
  for (const p of b.beneficiaries)
    if (p.wallet && !isAddress(p.wallet))
      return NextResponse.json({ error: `The payout address for ${p.name} doesn't look right.` }, { status: 400 });
  const trust: Trust = {
    id: newId(),
    name: b.name,
    settlor: b.settlor,
    protector: b.protector || undefined,
    protectorEmail: b.protectorEmail || undefined,
    settlorKey: newKey(),
    protectorKey: newKey(),
    deed: b.deed,
    perRequestMax: b.perRequestMax,
    liquidBuffer: b.liquidBuffer,
    beneficiaries: b.beneficiaries.map((p) => ({ ...p, id: newId(), key: newKey(), wallet: p.wallet || undefined })),
    check: b.check,
    createdAt: new Date().toISOString(),
  };
  // Open the trust's wallet now so its address can be funded straight away.
  // If the chain or CDP is unreachable the trust is still saved and the
  // wallet is opened on first view.
  const [address, block] = await Promise.allSettled([trustAddress(trust.id), currentBlock()]);
  if (address.status === "fulfilled" && address.value) trust.address = address.value;
  if (block.status === "fulfilled") trust.fromBlock = Number(block.value);
  await saveTrust(trust);
  // The settlor's private link is the only way back in to manage the trust.
  return NextResponse.json({ id: trust.id, key: trust.settlorKey });
}
