import { NextResponse } from "next/server";
import { roleFor } from "@/lib/access";
import { getTrust } from "@/lib/store";
import { isTestnet, netOf, requestTestUsdc, walletConfigured } from "@/lib/wallet";

export const maxDuration = 60;

// Test network only: asks Coinbase's faucet for free test USDC for this trust.
export async function POST(req: Request, ctx: RouteContext<"/api/trusts/[id]/faucet">) {
  const { id } = await ctx.params;
  const trust = await getTrust(id);
  if (!trust) return NextResponse.json({ error: "This trust doesn't exist." }, { status: 404 });
  const { key } = await req.json().catch(() => ({ key: undefined }));
  const role = roleFor(trust, typeof key === "string" ? key : undefined);
  if (role.kind !== "settlor" && role.kind !== "legacy")
    return NextResponse.json({ error: "Only the settlor can add test money." }, { status: 403 });
  if (!isTestnet(netOf(trust))) return NextResponse.json({ error: "Test money is only available on the test network." }, { status: 400 });
  if (!walletConfigured()) return NextResponse.json({ error: "The trust's wallet isn't connected yet." }, { status: 503 });
  try {
    return NextResponse.json({ tx: await requestTestUsdc(trust.id) });
  } catch (e) {
    return NextResponse.json({ error: `The faucet didn't send money: ${(e as Error).message}` }, { status: 502 });
  }
}
