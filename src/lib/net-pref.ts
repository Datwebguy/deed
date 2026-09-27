"use client";

import { useSyncExternalStore } from "react";

// Which side of Deed the visitor is using: testnet (test money, the default)
// or mainnet (real USDC on Base). Remembered in this browser.

export type SiteNet = "base-sepolia" | "base";
const KEY = "deed.network";
let current: SiteNet | null = null;
const listeners = new Set<() => void>();

function read(fallback: SiteNet): SiteNet {
  if (current) return current;
  try {
    const saved = localStorage.getItem(KEY);
    current = saved === "base" || saved === "base-sepolia" ? saved : fallback;
  } catch {
    current = fallback;
  }
  return current;
}

export function setSiteNet(net: SiteNet) {
  current = net;
  try {
    localStorage.setItem(KEY, net);
  } catch {
    // Storage blocked; the choice lasts for this page.
  }
  listeners.forEach((l) => l());
}

export function useSiteNet(fallback: SiteNet = "base-sepolia"): SiteNet {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => read(fallback),
    () => fallback,
  );
}
