import type { Beneficiary, Decision, Enforcement, Trust, TrustRequest, Verdict } from "./types";

// Fixed rules. These run after the trustee's reasoning and can only make a
// decision stricter: lower the amount or turn a yes into a no. Nothing the
// model writes can raise a limit here.

export function spentThisYear(requests: TrustRequest[], beneficiaryId: string, now = new Date()) {
  const year = now.getUTCFullYear();
  return requests
    .filter((r) => r.beneficiaryId === beneficiaryId && new Date(r.createdAt).getUTCFullYear() === year)
    .reduce((sum, r) => sum + (r.paid || 0), 0);
}

// True when the clause the trustee quoted really is in the wishes. Wording is
// compared loosely (case, punctuation, numbering, spacing); a quote joined
// with "…" must match piece by piece.
export function clauseInDeed(clause: string, deed: string) {
  const norm = (x: string) =>
    x
      .toLowerCase()
      .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
      .replace(/[^a-z0-9$]+/g, " ")
      .trim();
  const text = norm(deed);
  const parts = clause
    .split(/\.\.\.|\u2026/)
    .map((p) => norm(p.replace(/^\s*\d+[.)]\s*/, "")))
    .filter((p) => p.length > 0);
  return parts.length > 0 && parts.join("").length >= 12 && parts.every((p) => text.includes(p));
}

export function enforce(opts: {
  trust: Trust;
  beneficiary: Beneficiary;
  asked: number;
  decision: Decision;
  spent: number;
  spendable: number;
  paused?: boolean;
  // How many independent runs decided, and whether they agreed.
  runs?: { total: number; agree: boolean };
  // Set when a person has already reviewed and approved this payment.
  reviewed?: boolean;
}): { final: Verdict; amount: number; checks: Enforcement[]; review?: { reason: string; amount: number } } {
  const { trust, beneficiary, asked, decision, spent, spendable, paused, runs, reviewed } = opts;
  const checks: Enforcement[] = [];
  const wantsPay = decision.verdict === "approve" || decision.verdict === "partial";
  let amount = wantsPay ? decision.amount : 0;

  const limit = (rule: string, cap: number, note: string) => {
    const passed = amount <= cap;
    checks.push({ rule, passed, note: passed ? note : `${note}, so lowered to $${fmt(Math.max(0, cap))}` });
    if (!passed) amount = Math.max(0, cap);
  };

  if (wantsPay) {
    limit("Not more than asked", asked, `Asked for $${fmt(asked)}`);
    limit("Single payment limit", trust.perRequestMax, `The deed's limit per payment is $${fmt(trust.perRequestMax)}`);
    limit(
      "Yearly limit for this person",
      beneficiary.yearlyCap - spent,
      `${beneficiary.name} has $${fmt(beneficiary.yearlyCap - spent)} left this year`,
    );
    limit("Money the trust can spare", spendable, spendable > 0 ? `The trust holds $${fmt(spendable)}` : "The trust has no money yet, so this waits until it is funded");
    const hasWallet = Boolean(beneficiary.wallet);
    checks.push({
      rule: "Known payout address",
      passed: hasWallet,
      note: hasWallet ? "Paid only to the address the settlor saved" : "No saved address for this person, so nothing can be sent",
    });
    if (!hasWallet) amount = 0;
    if (decision.flagged) {
      checks.push({ rule: "Manipulation check", passed: false, note: "The request tried to override the deed, so it was stopped and flagged for the protector" });
      amount = 0;
    }
  }

  amount = Math.floor(amount * 100) / 100;
  let final: Verdict = decision.verdict;
  if (wantsPay) final = amount <= 0 ? "decline" : amount < asked ? "partial" : "approve";

  // A payment the code can't fully stand behind waits for a person.
  let review: { reason: string; amount: number } | undefined;
  if (wantsPay && amount > 0 && !reviewed) {
    const found = clauseInDeed(decision.clause, trust.deed);
    checks.push({
      rule: "Clause is in the wishes",
      passed: found,
      note: found ? "The quoted clause matches the wishes word for word" : "The quoted clause isn't in the wishes, so a person must review this",
    });
    if (!found) review = { reason: "The trustee quoted a clause that isn't in the wishes.", amount };
    if (runs && runs.total > 1) {
      checks.push({
        rule: "Independent runs agree",
        passed: runs.agree,
        note: runs.agree ? `All ${runs.total} runs reached the same answer` : `The ${runs.total} runs disagreed, so a person must review this`,
      });
      if (!runs.agree) review ??= { reason: `The ${runs.total} independent runs didn't agree.`, amount };
    }
    if (review) amount = 0;
  }
  // A pause holds an allowed payment for review rather than turning it into a
  // no; once payouts resume, the protector or settlor can approve it.
  if (wantsPay && paused && amount > 0) {
    checks.push({ rule: "Payouts paused", passed: false, note: "Payouts are paused, so this waits for review" });
    review = { reason: "Payouts were paused when this was decided.", amount };
    amount = 0;
  }
  return { final, amount, checks, review };
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
