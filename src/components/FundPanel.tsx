"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { erc20Abi, formatUnits, parseUnits, type Address } from "viem";
import { connect } from "@/lib/browser-wallet";

type Props = { trustId: string; address: string; network: string; usdc: string; testnet: boolean; explorer: string };

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function FundPanel({ trustId, address, network, usdc, testnet, explorer }: Props) {
  const router = useRouter();
  const [account, setAccount] = useState<Address | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [tx, setTx] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setStatus(label);
    try {
      await fn();
    } catch (e) {
      const msg = (e as { shortMessage?: string }).shortMessage ?? (e as Error).message;
      setError(msg.split("\n")[0]);
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  const connectWallet = () =>
    run("Connecting your wallet…", async () => {
      const { account, reader } = await connect(network);
      setAccount(account);
      const raw = await reader.readContract({ address: usdc as Address, abi: erc20Abi, functionName: "balanceOf", args: [account] });
      setWalletBalance(Number(formatUnits(raw, 6)));
      setStatus("");
    });

  const send = () =>
    run("Confirm the transfer in your wallet…", async () => {
      const value = Number(amount);
      if (!(value > 0)) throw new Error("Enter how much to send.");
      const { wallet, account, reader } = await connect(network);
      const hash = await wallet.writeContract({
        account,
        address: usdc as Address,
        abi: erc20Abi,
        functionName: "transfer",
        args: [address as Address, parseUnits(value.toFixed(2), 6)],
      });
      setTx(hash);
      setStatus("Sent. Waiting for the network to confirm…");
      const receipt = await reader.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The transfer failed on-chain.");
      setStatus(`$${value} is now held in trust.`);
      setAmount("");
      setWalletBalance((b) => (b === null ? b : Math.max(0, b - value)));
      router.refresh();
    });

  const faucet = () =>
    run("Asking Coinbase's test faucet…", async () => {
      const res = await fetch(`/api/trusts/${trustId}/faucet`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTx(data.tx);
      setStatus("Free test USDC arrived in the trust.");
      router.refresh();
    });

  async function copy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card p-5">
      <h3 className="font-medium">Add money</h3>
      <p className="mt-1 text-sm text-muted">
        Send USDC on {testnet ? "Base Sepolia (test network)" : "Base"} to the trust&apos;s own wallet. Once it&apos;s in, only
        the trustee can pay it out, and only to the people you named.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <code className="break-all rounded bg-rule/40 px-2 py-1">{address}</code>
        <button className="btn-ghost text-xs" onClick={copy} type="button">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {account ? (
          <>
            <p className="text-sm text-muted">
              Connected: {short(account)}
              {walletBalance !== null && ` · $${walletBalance.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`}
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="w-36">
                <input
                  className="field"
                  inputMode="decimal"
                  placeholder="Amount ($)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <button className="btn" disabled={busy} onClick={send} type="button">
                Send to the trust
              </button>
            </div>
          </>
        ) : (
          <button className="btn w-fit" disabled={busy} onClick={connectWallet} type="button">
            Connect wallet
          </button>
        )}
        {testnet && (
          <button className="btn-ghost w-fit text-sm" disabled={busy} onClick={faucet} type="button">
            Get free test USDC for this trust
          </button>
        )}
      </div>

      {status && <p className="mt-3 text-sm">{status}</p>}
      {tx && (
        <a className="mt-1 inline-block text-sm underline" href={`${explorer}/tx/${tx}`} target="_blank" rel="noreferrer">
          See the transaction
        </a>
      )}
      {error && <p className="mt-3 text-sm text-seal">{error}</p>}
    </div>
  );
}
