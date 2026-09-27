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

export type Net = "base" | "base-sepolia";

// The site's default network. Each trust can also choose its own: test money
// on Base Sepolia or real USDC on Base.
export const NETWORK = (process.env.TRUST_NETWORK ?? "base-sepolia") as Net;
export const TESTNET = NETWORK === "base-sepolia";

const NETS = {
  "base-sepolia": {
    chain: baseSepolia,
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address,
    explorer: "https://sepolia.basescan.org",
    rpc: process.env.BASE_SEPOLIA_RPC_URL,
  },
  base: {
    chain: base,
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
    explorer: "https://basescan.org",
    rpc: process.env.BASE_MAINNET_RPC_URL,
  },
} as const;

export const isTestnet = (net: Net) => net === "base-sepolia";
export const netOf = (t: { network?: Net }): Net => t.network ?? NETWORK;
export const usdcOf = (net: Net = NETWORK) => NETS[net].usdc;
export const explorerOf = (net: Net = NETWORK) => NETS[net].explorer;
export const explorerTx = (h: string, net: Net = NETWORK) => `${explorerOf(net)}/tx/${h}`;
export const explorerAddress = (a: string, net: Net = NETWORK) => `${explorerOf(net)}/address/${a}`;
// Kept for code that only needs the site default.
export const USDC = usdcOf(NETWORK);
export const EXPLORER = explorerOf(NETWORK);
export const CHAIN_ID = NETS[NETWORK].chain.id;

export const walletConfigured = () =>
  Boolean(process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET && process.env.CDP_WALLET_SECRET);

// BASE_RPC_URL still applies to the site's default network.
const clients = {
  "base-sepolia": createPublicClient({
    chain: baseSepolia,
    transport: http(NETS["base-sepolia"].rpc ?? (NETWORK === "base-sepolia" ? process.env.BASE_RPC_URL : undefined)),
  }),
  base: createPublicClient({
    chain: base,
    transport: http(NETS.base.rpc ?? (NETWORK === "base" ? process.env.BASE_RPC_URL : undefined)),
  }),
};
export const clientOf = (net: Net = NETWORK) => clients[net];
export const publicClient = clients[NETWORK];

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

function provider(trustId: string, net: Net) {
  const cacheKey = `${net}:${trustId}`;
  let p = providers.get(cacheKey);
  if (!p) {
    p = (async () => {
      const address = await trustAddress(trustId);
      if (!address) throw new Error("The trust's wallet isn't connected yet");
      const { CdpEvmWalletProvider } = await import("@coinbase/agentkit");
      return CdpEvmWalletProvider.configureWithWallet({
        apiKeyId: process.env.CDP_API_KEY_ID,
        apiKeySecret: process.env.CDP_API_KEY_SECRET,
        walletSecret: process.env.CDP_WALLET_SECRET,
        networkId: net,
        address,
        rpcUrl: NETS[net].rpc ?? (net === NETWORK ? process.env.BASE_RPC_URL : undefined),
      });
    })();
    p.catch(() => providers.delete(cacheKey));
    providers.set(cacheKey, p);
  }
  return p;
}

export async function usdcBalance(address: Address, net: Net = NETWORK): Promise<number> {
  const raw = await clientOf(net).readContract({ address: usdcOf(net), abi: erc20Abi, functionName: "balanceOf", args: [address] });
  return Number(formatUnits(raw, 6));
}

export async function ethBalance(address: Address, net: Net = NETWORK): Promise<number> {
  return Number(formatEther(await clientOf(net).getBalance({ address })));
}

// A USDC transfer on Base costs a small fraction of a cent, but the wallet
// still needs some ETH to send it.
const MIN_GAS = parseEther("0.00001");

async function ensureGas(address: Address, net: Net) {
  if ((await clientOf(net).getBalance({ address })) >= MIN_GAS) return;
  if (!isTestnet(net))
    throw new Error("The trust's wallet needs a little ETH on Base to pay network fees. Send about $1 of ETH to its address.");
  const { transactionHash } = await (await cdp()).evm.requestFaucet({ address, network: "base-sepolia", token: "eth" });
  await clientOf(net).waitForTransactionReceipt({ hash: transactionHash });
}

export async function payUsdc(trustId: string, to: Address, amount: number, net: Net = NETWORK): Promise<string> {
  const w = await provider(trustId, net);
  await ensureGas(w.getAddress() as Address, net);
  const hash = await w.sendTransaction({
    to: usdcOf(net),
    data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, parseUnits(amount.toFixed(2), 6)] }),
  });
  const receipt = await clientOf(net).waitForTransactionReceipt({ hash: hash as Hash });
  if (receipt.status !== "success") throw new Error("The payment transaction failed on-chain");
  return hash;
}

// Coinbase's faucet sends free test USDC to the trust, on Base Sepolia only.
export async function requestTestUsdc(trustId: string): Promise<string> {
  const address = await trustAddress(trustId);
  if (!address) throw new Error("The trust's wallet isn't connected yet");
  const { transactionHash } = await (await cdp()).evm.requestFaucet({ address, network: "base-sepolia", token: "usdc" });
  await clients["base-sepolia"].waitForTransactionReceipt({ hash: transactionHash });
  return transactionHash;
}

export const currentBlock = (net: Net = NETWORK) => clientOf(net).getBlockNumber();

export type Transfer = { hash: string; direction: "in" | "out"; counterparty: Address; amount: number; block: number };

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
// Public Base RPCs cap eth_getLogs ranges, so history is read in windows and
// only as far back as the trust's creation block (or the last ~2 days).
const WINDOW = BigInt(process.env.LOGS_WINDOW ?? 9_000);
const MAX_WINDOWS = 10;
const ZERO = BigInt(0);
const ONE = BigInt(1);

export async function usdcTransfers(address: Address, fromBlock?: number, net: Net = NETWORK): Promise<Transfer[]> {
  const client = clientOf(net);
  const latest = await client.getBlockNumber();
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
        client.getLogs({ address: usdcOf(net), event: TRANSFER, args: { to: address }, fromBlock: from, toBlock: to }),
        client.getLogs({ address: usdcOf(net), event: TRANSFER, args: { from: address }, fromBlock: from, toBlock: to }),
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
