import { NextResponse } from "next/server";
import { servConfigured } from "@/lib/serv";
import { NETWORK, ethBalance, publicClient, trustAddress, walletConfigured } from "@/lib/wallet";

export const dynamic = "force-dynamic";

// Reports what is connected. Never returns secrets.
export async function GET() {
  let wallet: `0x${string}` | null = null;
  let walletError: string | undefined;
  let gasEth: number | undefined;
  let chainBlock: number | undefined;
  let chainError: string | undefined;
  try {
    wallet = await trustAddress("health-check");
    if (wallet) gasEth = await ethBalance(wallet);
  } catch (e) {
    walletError = (e as Error).message.slice(0, 300);
  }
  try {
    chainBlock = Number(await publicClient.getBlockNumber());
  } catch (e) {
    chainError = (e as Error).message.split("\n")[0].slice(0, 200);
  }
  return NextResponse.json({
    reasoning: servConfigured(),
    walletKeys: walletConfigured(),
    network: NETWORK,
    runtime: process.version,
    walletReachable: Boolean(wallet),
    walletError,
    chainBlock,
    chainError,
    gasEth,
    storage: process.env.BLOB_READ_WRITE_TOKEN ? "private-blob" : "local-files",
  });
}
