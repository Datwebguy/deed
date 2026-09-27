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
    <div className="mt-3">
      {error && <p className="mb-2 text-xs text-muted">Showing the trustee&apos;s payouts only; the full history couldn&apos;t be read from the network.</p>}
      {rows.length === 0 ? (
        <p className="text-muted">No money has moved yet.</p>
      ) : (
        <ul className="card divide-y divide-rule">
          {rows.map((t) => (
            <li key={`${t.hash}-${t.direction}`} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
              <span>
                {t.direction === "in" ? "Received from " : "Paid to "}
                <span className="font-medium">{t.who}</span>
              </span>
              <span className="flex items-baseline gap-3">
                <span className={t.direction === "in" ? "text-leaf" : ""}>
                  {t.direction === "in" ? "+" : "−"}
                  {usd(t.amount)}
                </span>
                <a className="text-xs underline" href={explorerTx(t.hash)} target="_blank" rel="noreferrer">
                  {short(t.hash)}
                </a>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
