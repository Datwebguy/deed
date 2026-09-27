"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { connectWallet, disconnectWallet, preloadBaseAccount, walletSession } from "@/lib/browser-wallet";
import { useSiteNet, type SiteNet } from "@/lib/net-pref";

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function useWallet() {
  return useSyncExternalStore(walletSession.subscribe, walletSession.get, walletSession.server);
}

// Connect / connected button. Used in the header and wherever a wallet is needed.
export default function WalletChip({ network: fallback, className = "" }: { network: string; className?: string }) {
  const { address } = useWallet();
  // Connect on whichever side of Deed the visitor is using.
  const network = useSiteNet(fallback as SiteNet);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    preloadBaseAccount().catch(() => {});
  }, []);

  async function connect() {
    setBusy(true);
    setError("");
    try {
      await connectWallet(network);
    } catch (e) {
      const msg = (e as { shortMessage?: string }).shortMessage ?? (e as Error).message;
      setError(/reject|denied|cancel/i.test(msg) ? "Connection cancelled." : msg.split("\n")[0]);
    } finally {
      setBusy(false);
    }
  }

  if (address)
    return (
      <span className={`relative ${className}`}>
        <button type="button" className="chip !py-1.5 font-mono hover:border-ink" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="live-dot" /> {shortAddress(address)}
        </button>
        {open && (
          <span className="card absolute right-0 z-50 mt-2 grid w-56 gap-2 p-3 text-sm">
            <span className="text-xs text-muted">Connected wallet</span>
            <span className="break-all font-mono text-xs">{address}</span>
            <button
              type="button"
              className="btn-ghost !py-1.5 text-xs"
              onClick={() => {
                disconnectWallet();
                setOpen(false);
              }}
            >
              Disconnect
            </button>
          </span>
        )}
      </span>
    );

  return (
    <span className={`relative ${className}`}>
      <button type="button" className="btn-ghost !px-3.5 !py-2 text-sm" onClick={connect} disabled={busy}>
        {busy ? "Connecting…" : "Connect wallet"}
      </button>
      {error && <span className="card absolute right-0 z-50 mt-2 w-56 p-3 text-xs text-seal">{error}</span>}
    </span>
  );
}
