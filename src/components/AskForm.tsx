"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Person = { id: string; name: string; left: number };

// With an accessKey the form is locked to the one person whose link it is.
export default function AskForm({ trustId, people, accessKey }: { trustId: string; people: Person[]; accessKey?: string }) {
  const router = useRouter();
  const [who, setWho] = useState(people[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/trusts/${trustId}/requests`, {
        method: "POST",
        body: JSON.stringify({ beneficiaryId: who, amount, reason, evidence, key: accessKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAmount("");
      setReason("");
      setEvidence("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const left = people.find((p) => p.id === who)?.left;

  return (
    <form onSubmit={submit} className="card mt-3 grid gap-3 p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm">Who is asking</span>
          {people.length === 1 ? (
            <p className="field">{people[0].name}</p>
          ) : (
            <select className="field" value={who} onChange={(e) => setWho(e.target.value)}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {left !== undefined && <span className="text-xs text-muted">${left.toLocaleString("en-US")} left this year</span>}
        </label>
        <label className="grid gap-1">
          <span className="text-sm">How much ($)</span>
          <input className="field" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
      </div>
      <label className="grid gap-1">
        <span className="text-sm">What it&apos;s for</span>
        <textarea className="field min-h-20" required value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <label className="grid gap-1">
        <span className="text-sm">Proof (paste the invoice, bill or letter)</span>
        <textarea className="field min-h-20" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
      </label>
      {error && <p className="text-seal">{error}</p>}
      <button className="btn w-fit" disabled={busy}>
        {busy ? "The trustee is reading your request…" : "Send request"}
      </button>
    </form>
  );
}
