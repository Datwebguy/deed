"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Approve or decline a payment the fixed rules held back.
export default function ReviewButtons({
  trustId,
  requestId,
  accessKey,
  amount,
}: {
  trustId: string;
  requestId: string;
  accessKey?: string;
  amount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "approve" | "decline">("");
  const [error, setError] = useState("");

  async function rule(approve: boolean) {
    setBusy(approve ? "approve" : "decline");
    setError("");
    try {
      const res = await fetch(`/api/trusts/${trustId}/requests/${requestId}/review`, {
        method: "POST",
        body: JSON.stringify({ key: accessKey, approve }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" className="btn !py-2 text-sm" disabled={busy !== ""} onClick={() => rule(true)}>
        {busy === "approve" ? "Paying…" : `Approve $${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
      </button>
      <button type="button" className="btn-ghost !py-2 text-sm" disabled={busy !== ""} onClick={() => rule(false)}>
        {busy === "decline" ? "Declining…" : "Decline"}
      </button>
      {error && <p className="w-full text-sm text-seal">{error}</p>}
    </div>
  );
}
