import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  formatEther,
  formatUnits,
  http,
  parseAbiItem,
  parseEther,
  parseUnits,
  type Address,
  type Hash,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import type { CdpClient } from "@coinbase/cdp-sdk";
import type { CdpEvmWalletProvider } from "@coinbase/agentkit";

// The trust's wallet is a Coinbase AgentKit wallet (CDP server wallet), one
// per trust, found again by name. It only ever sends USDC, and only to
// addresses the settlor saved; the fixed rules decide the amount.

export const NETWORK = (process.env.TRUST_NETWORK ?? "base-sepolia") as "base" | "base-sepolia";
export const TESTNET = NETWORK === "base-sepolia";
const chain = TESTNET ? baseSepolia : base;
export const CHAIN_ID = chain.id;
export const USDC: Address = TESTNET
  ? "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const EXPLORER = TESTNET ? "https://sepolia.basescan.org" : "https://basescan.org";
export const explorerTx = (h: string) => `${EXPLORER}/tx/${h}`;
export const explorerAddress = (a: string) => `${EXPLORER}/address/${a}`;

export const walletConfigured = () =>
  Boolean(process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET && process.env.CDP_WALLET_SECRET);

export const publicClient = createPublicClient({ chain, transport: http(process.env.BASE_RPC_URL) });

// One CDP client per server instance; addresses and providers are cached so a
// page view costs one CDP call per trust at most.
let cdpPromise: Promise<CdpClient> | null = null;
function cdp() {
  cdpPromise ??= import("@coinbase/cdp-sdk").then(
    ({ CdpClient }) =>
      new CdpClient({
        apiKeyId: process.env.CDP_API_KEY_ID,
        apiKeySecret: process.env.CDP_API_KEY_SECRET,
        walletSecret: process.env.CDP_WALLET_SECRET,
      }),
  );
  return cdpPromise;
}

const addresses = new Map<string, Address>();
const providers = new Map<string, Promise<CdpEvmWalletProvider>>();

export async function trustAddress(trustId: string): Promise<Address | null> {
  if (!walletConfigured()) return null;
  const known = addresses.get(trustId);
  if (known) return known;
  const account = await (await cdp()).evm.getOrCreateAccount({ name: `deed-trust-${trustId}` });
  addresses.set(trustId, account.address);
  return account.address;
}

function provider(trustId: string) {
  let p = providers.get(trustId);
  if (!p) {
    p = (async () => {
      const address = await trustAddress(trustId);
      if (!address) throw new Error("The trust's wallet isn't connected yet");
      const { CdpEvmWalletProvider } = await import("@coinbase/agentkit");
      return CdpEvmWalletProvider.configureWithWallet({
        apiKeyId: process.env.CDP_API_KEY_ID,
        apiKeySecret: process.env.CDP_API_KEY_SECRET,
        walletSecret: process.env.CDP_WALLET_SECRET,
        networkId: NETWORK,
        address,
        rpcUrl: process.env.BASE_RPC_URL,
      });
    })();
    p.catch(() => providers.delete(trustId));
    providers.set(trustId, p);
  }
  return p;
}

export async function usdcBalance(address: Address): Promise<number> {
  const raw = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [address] });
  return Number(formatUnits(raw, 6));
}

export async function ethBalance(address: Address): Promise<number> {
  return Number(formatEther(await publicClient.getBalance({ address })));
}

// A USDC transfer on Base costs a small fraction of a cent, but the wallet
// still needs some ETH to send it.
const MIN_GAS = parseEther("0.00001");

async function ensureGas(address: Address) {
  if ((await publicClient.getBalance({ address })) >= MIN_GAS) return;
  if (!TESTNET)
    throw new Error("The trust's wallet needs a little ETH on Base to pay network fees. Send about $1 of ETH to its address.");
  const { transactionHash } = await (await cdp()).evm.requestFaucet({ address, network: "base-sepolia", token: "eth" });
  await publicClient.waitForTransactionReceipt({ hash: transactionHash });
}

export async function payUsdc(trustId: string, to: Address, amount: number): Promise<string> {
  const w = await provider(trustId);
  await ensureGas(w.getAddress() as Address);
  const hash = await w.sendTransaction({
    to: USDC,
    data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, parseUnits(amount.toFixed(2), 6)] }),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as Hash });
  if (receipt.status !== "success") throw new Error("The payment transaction failed on-chain");
  return hash;
}

// Test network only: Coinbase's faucet sends free test USDC to the trust.
export async function requestTestUsdc(trustId: string): Promise<string> {
  if (!TESTNET) throw new Error("Test money is only available on the test network");
  const address = await trustAddress(trustId);
  if (!address) throw new Error("The trust's wallet isn't connected yet");
  const { transactionHash } = await (await cdp()).evm.requestFaucet({ address, network: "base-sepolia", token: "usdc" });
  await publicClient.waitForTransactionReceipt({ hash: transactionHash });
  return transactionHash;
}

export const currentBlock = () => publicClient.getBlockNumber();

export type Transfer = { hash: string; direction: "in" | "out"; counterparty: Address; amount: number; block: number };

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
// Public Base RPCs cap eth_getLogs ranges, so history is read in windows and
// only as far back as the trust's creation block (or the last ~2 days).
const WINDOW = BigInt(process.env.LOGS_WINDOW ?? 9_000);
const MAX_WINDOWS = 10;
const ZERO = BigInt(0);
const ONE = BigInt(1);

export async function usdcTransfers(address: Address, fromBlock?: number): Promise<Transfer[]> {
  const latest = await publicClient.getBlockNumber();
  const floor = BigInt(fromBlock ?? 0);
  const ranges: [bigint, bigint][] = [];
  for (let to = latest; to >= floor && ranges.length < MAX_WINDOWS; to -= WINDOW) {
    const from = to - WINDOW + ONE > floor ? to - WINDOW + ONE : floor;
    ranges.push([from, to]);
    if (from === ZERO) break;
  }
  const logs = (
    await Promise.all(
      ranges.flatMap(([from, to]) => [
        publicClient.getLogs({ address: USDC, event: TRANSFER, args: { to: address }, fromBlock: from, toBlock: to }),
        publicClient.getLogs({ address: USDC, event: TRANSFER, args: { from: address }, fromBlock: from, toBlock: to }),
      ]),
    )
  ).flat();
  return logs
    .map((l) => {
      const incoming = l.args.to?.toLowerCase() === address.toLowerCase();
      return {
        hash: l.transactionHash,
        direction: incoming ? ("in" as const) : ("out" as const),
        counterparty: (incoming ? l.args.from : l.args.to) as Address,
        amount: Number(formatUnits(l.args.value ?? ZERO, 6)),
        block: Number(l.blockNumber),
      };
    })
    .sort((a, b) => b.block - a.block);
}
