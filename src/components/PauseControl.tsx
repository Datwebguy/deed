"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Lets the settlor or protector stop every payout at once.
export default function PauseControl({ trustId, accessKey, paused }: { trustId: string; accessKey?: string; paused: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (!paused && !confirm("Stop all payouts from this trust until you resume them?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/trusts/${trustId}/pause`, {
        method: "POST",
        body: JSON.stringify({ key: accessKey, paused: !paused }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className={paused ? "btn" : "btn-ghost"} disabled={busy} onClick={toggle} type="button">
        {paused ? "Resume payouts" : "Pause all payouts"}
      </button>
      {error && <p className="mt-2 text-sm text-seal">{error}</p>}
    </div>
  );
}
