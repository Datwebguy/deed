"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { erc20Abi, parseUnits, type Address } from "viem";
import {
  connect,
  hasInjectedWallet,
  isMobile,
  payWithBase,
  preloadBaseAccount,
  walletAppLinks,
} from "@/lib/browser-wallet";

type Props = {
  trustId: string;
  address: string;
  network: string;
  usdc: string;
  testnet: boolean;
  explorer: string;
  accessKey?: string;
};

export default function FundPanel({ trustId, address, network, usdc, testnet, explorer, accessKey }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [tx, setTx] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [env, setEnv] = useState({ injected: false, mobile: false, url: "" });

  useEffect(() => {
    preloadBaseAccount().catch(() => {});
    // Read after mount: these depend on the browser, not the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv({ injected: hasInjectedWallet(), mobile: isMobile(), url: window.location.href });
  }, []);

  function parsedAmount() {
    const value = Number(amount);
    if (!(value > 0)) throw new Error("Enter how much to send.");
    return value;
  }

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setTx("");
    setStatus(label);
    try {
      await fn();
    } catch (e) {
      const msg = (e as { shortMessage?: string }).shortMessage ?? (e as Error).message ?? "Something went wrong.";
      setError(/reject|denied|cancel/i.test(msg) ? "You cancelled the payment." : msg.split("\n")[0]);
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  const done = (value: number) => {
    setStatus(`$${value} is now held in trust.`);
    setAmount("");
    router.refresh();
  };

  // No await before pay(): the passkey popup must open straight from the tap.
  const payBase = () =>
    run("Confirm in the Base window…", async () => {
      const value = parsedAmount();
      await payWithBase(network, address, value);
      done(value);
    });

  const payInjected = () =>
    run("Confirm the transfer in your wallet…", async () => {
      const value = parsedAmount();
      const { wallet, account, reader } = await connect(network, "injected");
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
      done(value);
    });

  const faucet = () =>
    run("Asking Coinbase's test faucet…", async () => {
      const res = await fetch(`/api/trusts/${trustId}/faucet`, {
        method: "POST",
        body: JSON.stringify({ key: accessKey }),
      });
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
      <p className="mt-1 text-sm text-muted">USDC into the trust&apos;s wallet. Only the trustee can pay it out.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr]">
        <input
          className="field"
          inputMode="decimal"
          placeholder="Amount ($)"
          aria-label="Amount in dollars"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button className="btn justify-center" disabled={busy} onClick={payBase} type="button">
          Pay with Base
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">Any phone, with a passkey. Fees covered.</p>

      {env.injected ? (
        <button
          className="btn-ghost mt-3 w-full justify-center text-sm sm:w-fit"
          disabled={busy}
          onClick={payInjected}
          type="button"
        >
          Send from the wallet in this browser
        </button>
      ) : (
        env.mobile && (
          <div className="mt-4 text-sm">
            <p className="text-muted">Or open in your wallet app:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {walletAppLinks(env.url).map((l) => (
                <a key={l.name} className="btn-ghost text-xs" href={l.href}>
                  {l.name}
                </a>
              ))}
            </div>
          </div>
        )
      )}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted">Send to the address instead</summary>
        <p className="mt-2 text-xs text-muted">USDC on {testnet ? "Base Sepolia" : "Base"} only.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="break-all rounded bg-rule/40 px-2 py-1 text-xs">{address}</code>
          <button className="btn-ghost text-xs" onClick={copy} type="button">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </details>

      {testnet && (
        <div className="mt-4 border-t border-rule pt-4 text-sm">
          <p className="text-muted">Free test money:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn-ghost text-xs" disabled={busy} onClick={faucet} type="button">
              To this trust
            </button>
            <a className="btn-ghost text-xs" href="https://faucet.circle.com" target="_blank" rel="noreferrer">
              To your wallet
            </a>
          </div>
        </div>
      )}

      <div aria-live="polite">
        {status && <p className="mt-3 text-sm">{status}</p>}
        {tx && (
          <a
            className="mt-1 inline-block text-sm underline"
            href={`${explorer}/tx/${tx}`}
            target="_blank"
            rel="noreferrer"
          >
            See the transaction
          </a>
        )}
        {error && <p className="mt-3 text-sm text-seal">{error}</p>}
      </div>
    </div>
  );
}
