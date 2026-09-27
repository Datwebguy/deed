import { NextResponse } from "next/server";
import { allow } from "@/lib/rate-limit";
import { checkDeed, servConfigured } from "@/lib/serv";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!servConfigured()) return NextResponse.json({ error: "The reasoning service is not connected yet." }, { status: 503 });
  // Each check costs reasoning credits.
  if (!allow(req, "check", 30, 60 * 60 * 1000))
    return NextResponse.json({ error: "Too many checks for now. Try again in a little while." }, { status: 429 });
  const { deed } = await req.json();
  if (typeof deed !== "string" || deed.trim().length < 40)
    return NextResponse.json({ error: "Write a few sentences of wishes first." }, { status: 400 });
  try {
    return NextResponse.json(await checkDeed(deed.slice(0, 8000)));
  } catch (e) {
    return NextResponse.json({ error: `The deed check did not finish: ${(e as Error).message}` }, { status: 502 });
  }
}
