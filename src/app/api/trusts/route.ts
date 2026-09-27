import { NextResponse } from "next/server";
import { z } from "zod";
import { isAddress, type Address, type Hex } from "viem";
import { deedMessage } from "@/lib/deed-message";
import { newKey } from "@/lib/access";
import { newId, saveTrust } from "@/lib/store";
import { NETWORK, currentBlock, publicClient, trustAddress } from "@/lib/wallet";
import type { Trust } from "@/lib/types";

const Body = z.object({
  name: z.string().min(2).max(80),
  settlor: z.string().min(1).max(80),
  protector: z.string().max(80).optional(),
  protectorEmail: z.string().email().max(120).optional().or(z.literal("")),
  deed: z.string().min(40).max(8000),
  perRequestMax: z.coerce.number().positive(),
  network: z.enum(["base", "base-sepolia"]).default(NETWORK),
  liquidBuffer: z.coerce.number().min(0).default(0),
  beneficiaries: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        relation: z.string().max(60).default(""),
        wallet: z.string().refine((a) => isAddress(a), "wallet"),
        yearlyCap: z.coerce.number().positive(),
      }),
    )
    .min(1)
    .max(10),
  check: z.any().optional(),
  // The settlor's wallet signature over the exact terms (see deed-message).
  settlorAddress: z.string().refine((a) => isAddress(a)),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
  issuedAt: z.string().datetime(),
});

// A signature is only accepted for a few minutes after it was made.
const SIGNATURE_WINDOW_MS = 15 * 60 * 1000;

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
      beneficiaries: "Each person needs a name, a payout wallet and a yearly limit above zero.",
      settlorAddress: "Connect your wallet and sign to create the trust.",
      signature: "Connect your wallet and sign to create the trust.",
      issuedAt: "Sign again to create the trust.",
    };
    return NextResponse.json({ error: hint[field] ?? "Some details are missing or not valid." }, { status: 400 });
  }
  const b = parsed.data;
  // Only create the trust if the settlor's wallet signed these exact terms.
  const age = Date.now() - Date.parse(b.issuedAt);
  if (!(age >= -60_000 && age < SIGNATURE_WINDOW_MS))
    return NextResponse.json({ error: "That signature has expired. Sign again to create the trust." }, { status: 400 });
  const message = deedMessage({
    name: b.name,
    settlor: b.settlor,
    deed: b.deed,
    perRequestMax: b.perRequestMax,
    network: b.network,
    protector: b.protector || undefined,
    beneficiaries: b.beneficiaries,
    issuedAt: b.issuedAt,
  });
  let valid = false;
  try {
    // Works for ordinary wallets and for smart wallets such as Base Account.
    valid = await publicClient.verifyMessage({ address: b.settlorAddress as Address, message, signature: b.signature as Hex });
  } catch {
    return NextResponse.json({ error: "Couldn't check your signature right now. Try again in a moment." }, { status: 502 });
  }
  if (!valid) return NextResponse.json({ error: "The signature doesn't match these terms. Sign again." }, { status: 400 });

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
    network: b.network,
    liquidBuffer: b.liquidBuffer,
    beneficiaries: b.beneficiaries.map((p) => ({ ...p, id: newId(), key: newKey() })),
    settlorAddress: b.settlorAddress,
    settlorSignature: b.signature,
    signedAt: b.issuedAt,
    check: b.check,
    createdAt: new Date().toISOString(),
  };
  // Open the trust's wallet now so its address can be funded straight away.
  // If the chain or CDP is unreachable the trust is still saved and the
  // wallet is opened on first view.
  const [address, block] = await Promise.allSettled([trustAddress(trust.id), currentBlock(b.network)]);
  if (address.status === "fulfilled" && address.value) trust.address = address.value;
  if (block.status === "fulfilled") trust.fromBlock = Number(block.value);
  await saveTrust(trust);
  // The settlor's private link is the only way back in to manage the trust.
  return NextResponse.json({ id: trust.id, key: trust.settlorKey });
}
