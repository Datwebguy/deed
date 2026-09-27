import { NextResponse } from "next/server";
import { z } from "zod";
import { isAddress } from "viem";
import { newId, saveTrust } from "@/lib/store";
import type { Trust } from "@/lib/types";

const Body = z.object({
  name: z.string().min(2).max(80),
  settlor: z.string().min(1).max(80),
  protector: z.string().max(80).optional(),
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
  if (!parsed.success) return NextResponse.json({ error: "Some details are missing or not valid." }, { status: 400 });
  const b = parsed.data;
  for (const p of b.beneficiaries)
    if (p.wallet && !isAddress(p.wallet))
      return NextResponse.json({ error: `The payout address for ${p.name} doesn't look right.` }, { status: 400 });
  const trust: Trust = {
    id: newId(),
    name: b.name,
    settlor: b.settlor,
    protector: b.protector || undefined,
    deed: b.deed,
    perRequestMax: b.perRequestMax,
    liquidBuffer: b.liquidBuffer,
    beneficiaries: b.beneficiaries.map((p) => ({ ...p, id: newId(), wallet: p.wallet || undefined })),
    check: b.check,
    createdAt: new Date().toISOString(),
  };
  await saveTrust(trust);
  return NextResponse.json({ id: trust.id });
}
