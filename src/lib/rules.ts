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

export function enforce(opts: {
  trust: Trust;
  beneficiary: Beneficiary;
  asked: number;
  decision: Decision;
  spent: number;
  spendable: number;
}): { final: Verdict; amount: number; checks: Enforcement[] } {
  const { trust, beneficiary, asked, decision, spent, spendable } = opts;
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
      checks.push({ rule: "Manipulation check", passed: false, note: "The request tried to override the deed, so it was stopped and the protector told" });
      amount = 0;
    }
  }

  amount = Math.floor(amount * 100) / 100;
  let final: Verdict = decision.verdict;
  if (wantsPay) final = amount <= 0 ? "decline" : amount < asked ? "partial" : "approve";
  return { final, amount, checks };
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
