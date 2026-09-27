"use client";

import { createPublicClient, createWalletClient, custom, http, type Address, type EIP1193Provider } from "viem";
import { base, baseSepolia } from "viem/chains";

// The settlor's own wallet in the browser. Two ways in:
// - Base Account: a passkey wallet that opens in a popup, so it works in any
//   phone or desktop browser with no app or extension.
// - An injected wallet (MetaMask, Coinbase Wallet, Rabby… as an extension or
//   inside a wallet app's own browser).
// The trust's wallet itself stays on the server.

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export const chainFor = (network: string) => (network === "base" ? base : baseSepolia);

export const hasInjectedWallet = () => typeof window !== "undefined" && Boolean(window.ethereum);

export const isMobile = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Phone browsers block popups that don't open straight from a tap, so the
// SDK is loaded ahead of time and used without awaiting anything first.
type BaseAccountModule = typeof import("@base-org/account");
let baseAccount: BaseAccountModule | null = null;
let baseAccountLoading: Promise<BaseAccountModule> | null = null;
export function preloadBaseAccount() {
  baseAccountLoading ??= import("@base-org/account").then((m) => (baseAccount = m));
  return baseAccountLoading;
}

const providers = new Map<string, EIP1193Provider>();
function baseAccountProvider(network: string): EIP1193Provider {
  if (!baseAccount) throw new Error("The wallet is still loading. Tap again in a moment.");
  let p = providers.get(network);
  if (!p) {
    const sdk = baseAccount.createBaseAccountSDK({ appName: "Deed", appChainIds: [chainFor(network).id] });
    p = sdk.getProvider() as unknown as EIP1193Provider;
    providers.set(network, p);
  }
  return p;
}

// One-tap USDC payment from the payer's Base Account. Gas is covered, and it
// resolves once the payment has settled on-chain.
export async function payWithBase(network: string, to: string, amount: number) {
  if (!baseAccount) throw new Error("The wallet is still loading. Tap again in a moment.");
  const testnet = network !== "base";
  const { id } = await baseAccount.pay({ amount: amount.toFixed(2), to, testnet, telemetry: false });
  for (let i = 0; i < 30; i++) {
    const s = await baseAccount.getPaymentStatus({ id, testnet, telemetry: false });
    if (s.status === "completed") return id;
    if (s.status === "failed") throw new Error(s.reason ?? "The payment failed on-chain.");
    await new Promise((r) => setTimeout(r, 2000));
  }
  return id;
}

export async function connect(network: string, via: "injected" | "base") {
  const provider = via === "base" ? baseAccountProvider(network) : window.ethereum;
  if (!provider) throw new Error("No wallet found in this browser.");
  const chain = chainFor(network);
  const wallet = createWalletClient({ chain, transport: custom(provider) });
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

// Just the address, from whichever wallet is available.
export async function currentAccount(network: string): Promise<Address> {
  const provider = window.ethereum ?? baseAccountProvider(network);
  const [account] = (await provider.request({ method: "eth_requestAccounts" })) as Address[];
  return account;
}

// Opens this page inside a wallet app's own browser, where its wallet is injected.
export function walletAppLinks(url: string) {
  const bare = url.replace(/^https?:\/\//, "");
  return [
    { name: "Coinbase Wallet", href: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}` },
    { name: "MetaMask", href: `https://metamask.app.link/dapp/${bare}` },
    { name: "Trust Wallet", href: `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(url)}` },
  ];
}
