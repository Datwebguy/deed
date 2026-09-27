import type { Address } from "viem";
import { listRequests } from "./store";
import type { Trust } from "./types";
import { ethBalance, trustAddress, usdcBalance, usdcTransfers, type Transfer } from "./wallet";

// Real numbers only: balances and history are read from chain. With no
// wallet connected the trust has nothing it can pay out.
export async function trustState(t: Trust, opts: { history?: boolean } = {}) {
  const requests = await listRequests(t.id);
  let address: Address | null = null;
  let balance = 0;
  let gas = 0;
  let transfers: Transfer[] = [];
  let walletError: string | undefined;
  let historyError: string | undefined;
  try {
    address = await trustAddress(t.id);
    if (address) [balance, gas] = await Promise.all([usdcBalance(address), ethBalance(address)]);
  } catch (e) {
    walletError = (e as Error).message;
  }
  if (address && opts.history) {
    try {
      transfers = await usdcTransfers(address, t.fromBlock);
    } catch (e) {
      historyError = (e as Error).message.split("\n")[0];
    }
  }
  // Payouts can use everything liquid; liquidBuffer only limits what may be invested.
  const spendable = balance;
  return { requests, address, balance, gas, spendable, transfers, walletError, historyError };
}
