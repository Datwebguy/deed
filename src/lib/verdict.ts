import type { TrustRequest } from "./types";

// How a request reads to people: one label and colour, from the final
// verdict and whether money actually moved.

export type Tone = "leaf" | "seal" | "amber";
export const TONES: Record<Tone, { text: string; dot: string }> = {
  leaf: { text: "text-leaf bg-leaf-soft", dot: "bg-leaf" },
  seal: { text: "text-seal bg-seal-soft", dot: "bg-seal" },
  amber: { text: "text-amber bg-amber-soft", dot: "bg-amber" },
};

export function verdictOf(r: Pick<TrustRequest, "final" | "paid" | "payoutTx" | "checks" | "decision">): { label: string; tone: Tone } {
  const payable = r.final === "approve" || r.final === "partial";
  if (payable && r.payoutTx) return { label: r.final === "partial" ? `Paid in part · $${fmt(r.paid)}` : `Paid · $${fmt(r.paid)}`, tone: "leaf" };
  if (payable && r.checks?.some((c) => c.rule === "Payouts paused")) return { label: "Approved · held", tone: "amber" };
  if (payable) return { label: "Approved · not sent", tone: "amber" };
  if (r.decision?.flagged) return { label: "Stopped", tone: "seal" };
  if (r.final === "need_more") return { label: "Needs proof", tone: "amber" };
  return { label: "Declined", tone: "seal" };
}

export const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
