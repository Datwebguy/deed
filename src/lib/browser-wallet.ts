"use client";

import { createPublicClient, createWalletClient, custom, http, type Address, type EIP1193Provider } from "viem";
import { base, baseSepolia } from "viem/chains";

// The settlor's own wallet in the browser (MetaMask, Coinbase Wallet, Rabby…).
// Used to fund a trust and to fill in payout addresses; the trust's wallet
// itself stays on the server.

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export const chainFor = (network: string) => (network === "base" ? base : baseSepolia);

export function hasBrowserWallet() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export async function connect(network: string) {
  if (!window.ethereum)
    throw new Error("No wallet found in this browser. Install Coinbase Wallet or MetaMask, or open this page in your wallet app's browser.");
  const chain = chainFor(network);
  const wallet = createWalletClient({ chain, transport: custom(window.ethereum) });
  const [account] = await wallet.requestAddresses();
  if ((await wallet.getChainId()) !== chain.id) {
    try {
      await wallet.switchChain({ id: chain.id });
    } catch {
      await wallet.addChain({ chain });
      await wallet.switchChain({ id: chain.id });
    }
  }
  return { wallet, account: account as Address, chain, reader: createPublicClient({ chain, transport: http() }) };
}

// Just the address; no network switch is needed to read it.
export async function currentAccount(): Promise<Address> {
  if (!window.ethereum)
    throw new Error("No wallet found in this browser. Paste the address instead, or open this page in your wallet app's browser.");
  const [account] = await window.ethereum.request({ method: "eth_requestAccounts" });
  return account as Address;
}
