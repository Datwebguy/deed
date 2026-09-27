"use client";

import { useEffect } from "react";
import { setSiteNet, useSiteNet, type SiteNet } from "@/lib/net-pref";

const OPTIONS: [SiteNet, string][] = [
  ["base-sepolia", "Testnet"],
  ["base", "Mainnet"],
];

// Testnet / Mainnet switch for the header.
export default function NetworkSwitch({ fallback }: { fallback: SiteNet }) {
  const net = useSiteNet(fallback);
  return (
    <div role="radiogroup" aria-label="Network" className="flex rounded-full border border-rule bg-card p-0.5 text-xs">
      {OPTIONS.map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={net === value}
          onClick={() => setSiteNet(value)}
          className={`rounded-full px-2.5 py-1 transition ${
            net === value ? (value === "base" ? "bg-leaf text-paper" : "bg-amber text-paper") : "text-muted hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// A thin strip under the header while on testnet, so test money is never
// mistaken for real money.
export function NetworkStrip({ fallback }: { fallback: SiteNet }) {
  const net = useSiteNet(fallback);
  if (net !== "base-sepolia") return null;
  return (
    <div className="border-b border-amber/30 bg-amber-soft/70 px-4 py-1.5 text-center text-xs text-amber">
      Testnet · test money only, nothing here is real
    </div>
  );
}

// Put on a trust's page: the site follows the network that trust lives on.
export function FollowNetwork({ net }: { net: SiteNet }) {
  useEffect(() => {
    setSiteNet(net);
  }, [net]);
  return null;
}
