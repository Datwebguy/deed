"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Settlor only. Removes the trust and its requests for good.
export default function DeleteTrust({ trustId, accessKey, name, balance }: { trustId: string; accessKey?: string; name: string; balance: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/trusts/${trustId}/delete`, { method: "POST", body: JSON.stringify({ key: accessKey, confirm }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace("/?deleted=1");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button type="button" className="text-sm text-muted underline-offset-2 hover:text-seal hover:underline" onClick={() => setOpen(true)}>
        Delete this trust
      </button>
    );

  return (
    <div className="rounded-2xl border border-seal/40 bg-seal-soft/40 p-5">
      <p className="font-medium text-seal">Delete this trust?</p>
      <p className="mt-1 text-sm text-muted">
        The wishes, links and every decision are removed for good.
        {balance > 0 && ` The $${balance.toFixed(2)} in its wallet stays there.`}
      </p>
      <label className="mt-3 grid gap-1.5 text-sm">
        Type <span className="font-medium">{name}</span> to confirm
        <input className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      {error && <p className="mt-2 text-sm text-seal">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn !bg-seal"
          disabled={busy || confirm.trim().toLowerCase() !== name.trim().toLowerCase()}
          onClick={remove}
        >
          {busy ? "Deleting…" : "Delete for good"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
