import { NextResponse } from "next/server";
import { z } from "zod";
import { roleFor } from "@/lib/access";
import type { Address } from "viem";
import { TREASURY } from "@/lib/demo";
import { oneAtATime } from "@/lib/queue";
import { deleteTrust, getTrust } from "@/lib/store";
import { isTestnet, netOf, payUsdc, trustAddress, usdcBalance } from "@/lib/wallet";

const Body = z.object({ key: z.string().max(100).optional(), confirm: z.string().max(80) });

// Only the settlor can delete a trust, and must type its name to confirm.
export async function POST(req: Request, ctx: RouteContext<"/api/trusts/[id]/delete">) {
  const { id } = await ctx.params;
  const trust = await getTrust(id);
  if (!trust) return NextResponse.json({ error: "This trust doesn't exist." }, { status: 404 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Type the trust's name to confirm." }, { status: 400 });
  const role = roleFor(trust, parsed.data.key);
  if (role.kind !== "settlor" && role.kind !== "legacy")
    return NextResponse.json({ error: "Only the settlor can delete this trust." }, { status: 403 });
  if (parsed.data.confirm.trim().toLowerCase() !== trust.name.trim().toLowerCase())
    return NextResponse.json({ error: "The name doesn't match." }, { status: 400 });
  // Money left in the trust goes back before anything is deleted: to the
  // wallet that signed the trust, or for a demo, to the demo treasury.
  return oneAtATime(trust.id, async () => {
    let returnedTx: string | undefined;
    const address = await trustAddress(trust.id).catch(() => null);
    const balance = address ? Math.floor((await usdcBalance(address, netOf(trust)).catch(() => 0)) * 100) / 100 : 0;
    if (balance > 0) {
      const to = trust.settlorAddress ?? (trust.demo ? await trustAddress(TREASURY) : null);
      if (!to && !isTestnet(netOf(trust)))
        return NextResponse.json(
          { error: "This trust still holds money and has no signing wallet to return it to." },
          { status: 409 },
        );
      if (to) {
        try {
          returnedTx = await payUsdc(trust.id, to as Address, balance, netOf(trust));
        } catch (e) {
          return NextResponse.json(
            { error: `Couldn't return the $${balance} first: ${(e as Error).message}` },
            { status: 502 },
          );
        }
      }
    }
    await deleteTrust(trust);
    return NextResponse.json({ deleted: true, returned: returnedTx ? balance : 0, returnedTx });
  });
}
