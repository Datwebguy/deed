import { NextResponse } from "next/server";
import { createDemoTrust, demoEnabled } from "@/lib/demo";
import { allow } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!demoEnabled()) return NextResponse.json({ error: "The demo isn't available right now." }, { status: 503 });
  // A few demo trusts per visitor per hour, so the treasury isn't drained.
  if (!allow(req, "demo", 5, 60 * 60 * 1000))
    return NextResponse.json({ error: "You've made a few demos already. Try again in an hour." }, { status: 429 });

  try {
    const { trust, funded } = await createDemoTrust();
    return NextResponse.json({ id: trust.id, key: trust.beneficiaries[0].key, funded });
  } catch (e) {
    return NextResponse.json({ error: `The demo couldn't start: ${(e as Error).message}` }, { status: 502 });
  }
}
