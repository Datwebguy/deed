import type { TrustRequest, Verdict } from "@/lib/types";
import { explorerTx } from "@/lib/wallet";

const LABEL: Record<Verdict, [string, string]> = {
  approve: ["Paid", "text-leaf"],
  partial: ["Paid in part", "text-leaf"],
  decline: ["Declined", "text-seal"],
  need_more: ["Needs proof", "text-amber"],
};

export default function Decisions({ requests, names }: { requests: TrustRequest[]; names: Record<string, string> }) {
  if (requests.length === 0) return <p className="mt-3 text-muted">No requests yet.</p>;
  return (
    <ul className="mt-3 grid gap-4">
      {requests.map((r) => {
        const payable = r.final === "approve" || r.final === "partial";
        // An approval only reads "Paid" once money actually moved on-chain.
        const [label, color] = payable && !r.payoutTx ? ["Approved, not sent", "text-amber"] : LABEL[r.final];
        return (
          <li key={r.id} className="card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p>
                <span className="font-medium">{names[r.beneficiaryId] ?? "Someone"}</span> asked for ${r.amount.toLocaleString("en-US")}
              </p>
              <p className={`font-medium ${color}`}>
                {label}
                {payable && r.paid > 0 ? ` $${r.paid.toLocaleString("en-US")}` : ""}
              </p>
            </div>
            <p className="mt-1 text-muted">“{r.reason}”</p>
            {r.decision && (
              <div className="mt-3 border-l-2 border-rule pl-3">
                <ul className="grid gap-1">
                  {r.decision.reasons.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
                {r.decision.askFor && <p className="mt-1 text-amber">Please send: {r.decision.askFor}</p>}
                <p className="mt-2 font-serif text-sm italic text-muted">Relied on: “{r.decision.clause}”</p>
              </div>
            )}
            {r.checks && r.checks.length > 0 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted">Fixed rules checked</summary>
                <ul className="mt-2 grid gap-1">
                  {r.checks.map((c, i) => (
                    <li key={i} className={c.passed ? "" : "text-seal"}>
                      {c.passed ? "✓" : "✗"} {c.rule}: {c.note}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {r.payoutTx && (
              <a className="mt-3 inline-block text-sm underline" href={explorerTx(r.payoutTx)} target="_blank">
                See the payment
              </a>
            )}
            {payable && !r.payoutTx && r.payoutError && (
              <p className="mt-3 text-sm text-seal">Approved, but the payment didn&apos;t go through: {r.payoutError}</p>
            )}
            <p className="mt-3 text-xs text-muted">{new Date(r.createdAt).toUTCString()}</p>
          </li>
        );
      })}
    </ul>
  );
}
