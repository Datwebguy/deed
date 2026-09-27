"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSiteNet, useSiteNet } from "@/lib/net-pref";

// Makes a funded demo trust and opens it as Ada. No wallet needed.
export default function TryDemo({ className = "btn-ghost", label = "Try the demo" }: { className?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const net = useSiteNet();
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // The demo runs on test money.
      setSiteNet("base-sepolia");
      router.push(`/t/${data.id}?k=${data.key}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <span className="inline-grid gap-1">
      <button type="button" className={className} onClick={start} disabled={busy}>
        {busy ? "Setting up a funded demo…" : net === "base" ? `${label} · testnet` : label}
      </button>
      {error && <span className="text-xs text-seal">{error}</span>}
    </span>
  );
}
