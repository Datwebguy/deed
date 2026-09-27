import { NextResponse } from "next/server";
import { z } from "zod";
import { canPause, roleFor } from "@/lib/access";
import { getTrust, saveTrust } from "@/lib/store";

const Body = z.object({ key: z.string().max(100).optional(), paused: z.boolean() });

// The settlor or protector can stop all payouts at once, and start them again.
export async function POST(req: Request, ctx: RouteContext<"/api/trusts/[id]/pause">) {
  const { id } = await ctx.params;
  const trust = await getTrust(id);
  if (!trust) return NextResponse.json({ error: "This trust doesn't exist." }, { status: 404 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Say whether to pause or resume." }, { status: 400 });
  const role = roleFor(trust, parsed.data.key);
  if (!canPause(role)) return NextResponse.json({ error: "Only the settlor or protector can do this." }, { status: 403 });
  trust.paused = parsed.data.paused
    ? { at: new Date().toISOString(), by: role.kind === "protector" ? "protector" : "settlor" }
    : undefined;
  await saveTrust(trust);
  return NextResponse.json({ paused: Boolean(trust.paused) });
}
