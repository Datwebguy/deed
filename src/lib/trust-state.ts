import type { Address } from "viem";
import { listRequests } from "./store";
import type { Trust } from "./types";
import { trustAddress, usdcBalance } from "./wallet";

// Real numbers only: the balance is read from chain. With no wallet
// connected the trust has nothing it can pay out.
export async function trustState(t: Trust) {
  const requests = await listRequests(t.id);
  let address: Address | null = null;
  let balance = 0;
  let walletError: string | undefined;
  try {
    address = await trustAddress(t.id);
    if (address) balance = await usdcBalance(address);
  } catch (e) {
    walletError = (e as Error).message;
  }
  // Payouts can use everything liquid; liquidBuffer only limits what may be invested.
  const spendable = balance;
  return { requests, address, balance, spendable, walletError };
}
