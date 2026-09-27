"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Thinking from "@/components/ui/Thinking";
import type { TrustRequest } from "@/lib/types";
import { TONES, fmt, verdictOf } from "@/lib/verdict";

type Person = { id: string; name: string; left: number; cap?: number };

const STAGES = ["Reading your request", "Finding the clause in the wishes", "Checking the fixed rules", "Sending the payment"];

// With an accessKey the form is locked to the one person whose link it is.
export default function AskForm({
  trustId,
  people,
  accessKey,
  explorer,
}: {
  trustId: string;
  people: Person[];
  accessKey?: string;
  explorer: string;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [who, setWho] = useState(people[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TrustRequest | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/trusts/${trustId}/requests`, {
        method: "POST",
        body: JSON.stringify({ beneficiaryId: who, amount: amount.replace(/[$,\s]/g, ""), reason, evidence, key: accessKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
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

  const person = people.find((p) => p.id === who);

  return (
    <div className="mt-4">
      <AnimatePresence mode="wait" initial={false}>
        {busy ? (
          <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Thinking steps={STAGES} every={3200} />
            <p className="mt-3 text-center text-xs text-muted">The trustee reads every request against the wishes. This takes about 20 seconds.</p>
          </motion.div>
        ) : result ? (
          <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Result r={result} reduce={Boolean(reduce)} explorer={explorer} onAgain={() => setResult(null)} />
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card grid gap-4 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-ink-2">Who is asking</span>
                {people.length === 1 ? (
                  <p className="field bg-paper-2/60">{people[0].name}</p>
                ) : (
                  <select className="field" value={who} onChange={(e) => setWho(e.target.value)}>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
                {person && (
                  <span className="mt-1 grid gap-1">
                    <span className="text-xs text-muted">${fmt(person.left)} left this year</span>
                    {person.cap ? (
                      <span className="h-1 overflow-hidden rounded-full bg-rule/60">
                        <span className="block h-full rounded-full bg-leaf" style={{ width: `${Math.min(100, (person.left / person.cap) * 100)}%` }} />
                      </span>
                    ) : null}
                  </span>
                )}
              </label>
              <label className="grid content-start gap-1.5">
                <span className="text-sm font-medium text-ink-2">How much ($)</span>
                <input className="field font-serif text-2xl" inputMode="decimal" required placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
            </div>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-ink-2">What it&apos;s for</span>
              <textarea className="field min-h-24" required placeholder="Term 2 school fees for Greenfield Secondary." value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-ink-2">
                Proof <span className="font-normal text-muted">· paste the invoice, bill or letter</span>
              </span>
              <textarea className="field min-h-24 font-mono text-sm" placeholder="Invoice #1042 · Greenfield Secondary · Term 2 · $420" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
            </label>
            {error && (
              <p className="rounded-xl bg-seal-soft px-4 py-3 text-sm text-seal" role="alert">
                {error}
              </p>
            )}
            <button className="btn-seal w-full sm:w-fit" disabled={busy}>
              Send to the trustee <span aria-hidden>→</span>
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Result({ r, reduce, explorer, onAgain }: { r: TrustRequest; reduce: boolean; explorer: string; onAgain: () => void }) {
  const v = verdictOf(r);
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-6 py-5">
        <div>
          <p className="eyebrow">The trustee decided</p>
          <p className="font-serif text-3xl">${fmt(r.amount)} asked</p>
        </div>
        <motion.span
          initial={reduce ? false : { scale: 2.2, rotate: -18, opacity: 0 }}
          animate={{ scale: 1, rotate: -4, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.15 }}
          className={`stamp text-sm ${TONES[v.tone].text}`}
        >
          {v.label}
        </motion.span>
      </div>
      <div className="grid gap-3 px-6 py-5">
        {r.decision?.reasons.map((x, i) => (
          <motion.p key={i} initial={reduce ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.12 }}>
            {x}
          </motion.p>
        ))}
        {r.decision?.askFor && <p className="rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber">Please send: {r.decision.askFor}</p>}
        {r.decision?.clause && <blockquote className="border-l-2 border-gold pl-3 font-serif italic text-muted">“{r.decision.clause}”</blockquote>}
        {r.payoutError && <p className="text-sm text-seal">The payment didn&apos;t go through: {r.payoutError}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-paper-2/50 px-6 py-4">
        {r.payoutTx ? (
          <a className="chip font-mono hover:border-ink" href={`${explorer}/tx/${r.payoutTx}`} target="_blank" rel="noreferrer">
            USDC sent · {r.payoutTx.slice(0, 8)}…{r.payoutTx.slice(-4)} ↗
          </a>
        ) : (
          <span className="text-sm text-muted">It&apos;s saved below with every other decision.</span>
        )}
        <button type="button" className="btn-ghost text-sm" onClick={onAgain}>
          Ask for something else
        </button>
      </div>
    </div>
  );
}
