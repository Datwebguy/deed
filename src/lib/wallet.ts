import { createPublicClient, encodeFunctionData, erc20Abi, formatUnits, http, parseUnits, type Address } from "viem";
import { base, baseSepolia } from "viem/chains";

// The trust's wallet is a Coinbase AgentKit wallet (CDP server wallet), one
// per trust, found again by name. It only ever sends USDC, and only to
// addresses the settlor saved; the fixed rules decide the amount.

export const NETWORK = (process.env.TRUST_NETWORK ?? "base-sepolia") as "base" | "base-sepolia";
const chain = NETWORK === "base" ? base : baseSepolia;
export const USDC: Address =
  NETWORK === "base" ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" : "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const explorerTx = (h: string) =>
  `${NETWORK === "base" ? "https://basescan.org" : "https://sepolia.basescan.org"}/tx/${h}`;
export const explorerAddress = (a: string) =>
  `${NETWORK === "base" ? "https://basescan.org" : "https://sepolia.basescan.org"}/address/${a}`;

export const walletConfigured = () =>
  Boolean(process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET && process.env.CDP_WALLET_SECRET);

const publicClient = createPublicClient({ chain, transport: http(process.env.BASE_RPC_URL) });

async function provider(trustId: string) {
  const { CdpEvmWalletProvider } = await import("@coinbase/agentkit");
  const { CdpClient } = await import("@coinbase/cdp-sdk");
  // Resolve (or create) this trust's account by a stable name, then hand it to AgentKit.
  const cdp = new CdpClient({
    apiKeyId: process.env.CDP_API_KEY_ID,
    apiKeySecret: process.env.CDP_API_KEY_SECRET,
    walletSecret: process.env.CDP_WALLET_SECRET,
  });
  const account = await cdp.evm.getOrCreateAccount({ name: `deed-trust-${trustId}` });
  return CdpEvmWalletProvider.configureWithWallet({
    apiKeyId: process.env.CDP_API_KEY_ID,
    apiKeySecret: process.env.CDP_API_KEY_SECRET,
    walletSecret: process.env.CDP_WALLET_SECRET,
    networkId: NETWORK,
    address: account.address,
  });
}

export async function trustAddress(trustId: string): Promise<Address | null> {
  if (!walletConfigured()) return null;
  const w = await provider(trustId);
  return w.getAddress() as Address;
}

export async function usdcBalance(address: Address): Promise<number> {
  const raw = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [address] });
  return Number(formatUnits(raw, 6));
}

export async function payUsdc(trustId: string, to: Address, amount: number): Promise<string> {
  const w = await provider(trustId);
  const hash = await w.sendTransaction({
    to: USDC,
    data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, parseUnits(amount.toFixed(2), 6)] }),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
  if (receipt.status !== "success") throw new Error("The payment transaction failed on-chain");
  return hash;
}
