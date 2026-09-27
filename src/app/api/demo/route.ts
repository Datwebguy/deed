import { NextResponse } from "next/server";
import { createDemoTrust, demoEnabled } from "@/lib/demo";

export const maxDuration = 60;

// A few demo trusts per visitor per hour, so the treasury isn't drained.
const recent = new Map<string, number[]>();
const LIMIT = 5;
const HOUR = 60 * 60 * 1000;

export async function POST(req: Request) {
  if (!demoEnabled()) return NextResponse.json({ error: "The demo isn't available right now." }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < HOUR);
  if (times.length >= LIMIT) return NextResponse.json({ error: "You've made a few demos already. Try again in an hour." }, { status: 429 });
  recent.set(ip, [...times, now]);

  try {
    const { trust, funded } = await createDemoTrust();
    return NextResponse.json({ id: trust.id, key: trust.beneficiaries[0].key, funded });
  } catch (e) {
    return NextResponse.json({ error: `The demo couldn't start: ${(e as Error).message}` }, { status: 502 });
  }
}
