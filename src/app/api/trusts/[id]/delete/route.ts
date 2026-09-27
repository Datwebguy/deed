import { NextResponse } from "next/server";
import { z } from "zod";
import { roleFor } from "@/lib/access";
import { deleteTrust, getTrust } from "@/lib/store";

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
  await deleteTrust(trust);
  return NextResponse.json({ deleted: true });
}
