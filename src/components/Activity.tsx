import type { TrustRequest } from "@/lib/types";
import { explorerTx, type Transfer } from "@/lib/wallet";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

// Every USDC movement in and out of the trust's wallet, read from chain.
// If the chain history can't be read, the payouts the trustee made are shown
// from its own records instead.
export default function Activity({
  transfers,
  requests,
  labels,
  error,
}: {
  transfers: Transfer[];
  requests: TrustRequest[];
  labels: Record<string, string>;
  error?: string;
}) {
  type Row = { hash: string; direction: "in" | "out"; amount: number; who: string };
  const rows: Row[] = error
    ? requests
        .filter((r) => r.payoutTx)
        .map((r) => ({ hash: r.payoutTx!, direction: "out", amount: r.paid, who: labels[r.beneficiaryId] ?? "someone" }))
    : transfers.map((t) => ({ ...t, who: labels[t.counterparty.toLowerCase()] ?? short(t.counterparty) }));

  return (
    <div className="mt-4">
      {error && (
        <p className="mb-2 text-xs text-muted">
          {error === "no wallet" ? "Recorded payouts." : "Recorded payouts only; the chain couldn't be read just now."}
        </p>
      )}
      {rows.length === 0 ? (
        <div className="card px-6 py-10 text-center text-muted">No money has moved yet.</div>
      ) : (
        <ul className="card divide-y divide-rule overflow-hidden">
          {rows.map((t) => (
            <li key={`${t.hash}-${t.direction}`} className="flex items-center gap-3 px-4 py-3.5 text-sm sm:px-5">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full text-base ${
                  t.direction === "in" ? "bg-leaf-soft text-leaf" : "bg-paper-2 text-ink-2"
                }`}
                aria-hidden
              >
                {t.direction === "in" ? "↓" : "↑"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  {t.direction === "in" ? "Received from " : "Paid to "}
                  <span className="font-medium">{t.who}</span>
                </span>
                <a className="font-mono text-xs text-muted hover:text-ink" href={explorerTx(t.hash)} target="_blank" rel="noreferrer">
                  {short(t.hash)} ↗
                </a>
              </span>
              <span className={`font-mono tabular-nums ${t.direction === "in" ? "text-leaf" : ""}`}>
                {t.direction === "in" ? "+" : "−"}
                {usd(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
