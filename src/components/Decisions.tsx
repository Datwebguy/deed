import type { TrustRequest } from "@/lib/types";
import { TONES, fmt, verdictOf } from "@/lib/verdict";
import { explorerTx } from "@/lib/wallet";

// Every decision as a timeline: what was asked, the verdict stamp, the reasons
// in plain words, the clause relied on, and the fixed rules behind it.

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Decisions({ requests, names }: { requests: TrustRequest[]; names: Record<string, string> }) {
  if (requests.length === 0)
    return (
      <div className="card mt-4 grid place-items-center px-6 py-12 text-center">
        <p className="font-serif text-2xl">No requests yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          When someone asks the trustee for money, the decision and its reasons will appear here.
        </p>
      </div>
    );

  return (
    <ol className="relative mt-4 grid gap-4 pl-6">
      <span className="absolute top-3 bottom-3 left-[5px] w-px bg-rule" aria-hidden />
      {requests.map((r) => {
        const v = verdictOf(r);
        return (
          <li key={r.id} className="relative">
            <span
              className={`absolute top-6 -left-6 size-[11px] rounded-full ring-4 ring-paper ${TONES[v.tone].dot}`}
              aria-hidden
            />
            <article className="card p-5">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">
                    <span className="font-medium text-ink">{names[r.beneficiaryId] ?? "Someone"}</span> asked ·{" "}
                    {ago(r.createdAt)}
                  </p>
                  <p className="font-serif text-3xl">${fmt(r.amount)}</p>
                </div>
                <span className={`stamp -rotate-2 ${TONES[v.tone].text}`}>{v.label}</span>
              </header>

              <p className="mt-2 text-ink-2">“{r.reason}”</p>

              {r.decision?.flagged && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-seal/50 bg-seal-soft/60 px-3 py-1 text-xs text-seal">
                  ⚑ Tried to override the wishes · flagged for the protector
                  {r.protectorAlerted ? " · protector emailed" : ""}
                </p>
              )}

              {r.decision && (
                <div className="mt-4 grid gap-3">
                  <ul className="grid gap-1 text-sm">
                    {r.decision.reasons.map((x, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-muted" aria-hidden />
                        {x}
                      </li>
                    ))}
                  </ul>
                  {r.decision.askFor && (
                    <p className="rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber">
                      <span className="font-medium">Please send:</span> {r.decision.askFor}
                    </p>
                  )}
                  <blockquote className="border-l-2 border-gold pl-3 font-serif italic text-muted">
                    “{r.decision.clause}”
                  </blockquote>
                </div>
              )}

              {(r.checks?.length || r.payoutTx || r.payoutError) && (
                <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-rule pt-3 text-sm">
                  {r.checks && r.checks.length > 0 && (
                    <details className="group w-full">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-muted hover:text-ink">
                        <span className="transition-transform group-open:rotate-90">›</span>
                        Fixed rules · {r.checks.filter((c) => c.passed).length}/{r.checks.length} passed
                      </summary>
                      <ul className="mt-2 grid gap-1.5 pl-4">
                        {r.checks.map((c, i) => (
                          <li key={i} className="flex gap-2">
                            <span
                              className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[9px] text-paper ${c.passed ? "bg-leaf" : "bg-seal"}`}
                            >
                              {c.passed ? "✓" : "!"}
                            </span>
                            <span>
                              <span className="font-medium">{c.rule}</span>{" "}
                              <span className="text-muted">· {c.note}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {r.payoutTx && (
                    <a
                      className="chip font-mono hover:border-ink"
                      href={explorerTx(r.payoutTx)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      USDC sent · {r.payoutTx.slice(0, 8)}…{r.payoutTx.slice(-4)} ↗
                    </a>
                  )}
                  {!r.payoutTx && r.payoutError && (
                    <p className="text-seal">The payment didn&apos;t go through: {r.payoutError}</p>
                  )}
                </footer>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
