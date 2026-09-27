import type { Address } from "viem";
import { listRequests } from "./store";
import type { Trust } from "./types";
import { ethBalance, netOf, trustAddress, usdcBalance } from "./wallet";

// Real numbers only: balances are read from chain. With no wallet connected
// the trust has nothing it can pay out. History is read separately (see
// ActivitySection) so it never holds up the page.
export async function trustState(t: Trust) {
  const requests = await listRequests(t);
  let address: Address | null = null;
  let balance = 0;
  let gas = 0;
  let walletError: string | undefined;
  try {
    address = await trustAddress(t.id);
    if (address) [balance, gas] = await Promise.all([usdcBalance(address, netOf(t)), ethBalance(address, netOf(t))]);
  } catch (e) {
    walletError = (e as Error).message;
  }
  // Payouts can use everything liquid; liquidBuffer only limits what may be invested.
  const spendable = balance;
  return { requests, address, balance, gas, spendable, walletError };
}
