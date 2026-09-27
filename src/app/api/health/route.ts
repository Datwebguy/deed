import { NextResponse } from "next/server";
import { servConfigured } from "@/lib/serv";
import { NETWORK, trustAddress, walletConfigured } from "@/lib/wallet";

export const dynamic = "force-dynamic";

// Reports what is connected. Never returns secrets.
export async function GET() {
  let wallet: string | null = null;
  let walletError: string | undefined;
  try {
    wallet = await trustAddress("health-check");
  } catch (e) {
    walletError = (e as Error).message.slice(0, 300);
  }
  return NextResponse.json({
    reasoning: servConfigured(),
    walletKeys: walletConfigured(),
    network: NETWORK,
    runtime: process.version,
    walletReachable: Boolean(wallet),
    walletError,
    storage: process.env.BLOB_READ_WRITE_TOKEN ? "private-blob" : "local-files",
  });
}
