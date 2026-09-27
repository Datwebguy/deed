export type Beneficiary = {
  id: string;
  name: string;
  relation: string;
  wallet?: string; // where payouts go (USDC on Base)
  yearlyCap: number; // hard ceiling per calendar year, in USD
};

export type Gap = { issue: string; question: string; suggestion: string };

export type DeedCheck = {
  summary: string;
  gaps: Gap[];
  flowchart: string; // mermaid source, rendered as "how your trustee decides"
  checkedAt: string;
};

export type Trust = {
  id: string;
  name: string;
  settlor: string;
  protector?: string;
  deed: string;
  perRequestMax: number;
  liquidBuffer: number; // USD always kept ready for payouts
  beneficiaries: Beneficiary[];
  check?: DeedCheck;
  createdAt: string;
};

export type Verdict = "approve" | "partial" | "decline" | "need_more";

export type Decision = {
  verdict: Verdict;
  amount: number; // amount the trustee would pay (0 unless approve/partial)
  clause: string; // clause of the deed relied on
  reasons: string[];
  askFor?: string; // what evidence is missing, if need_more
  flagged?: boolean; // looks like manipulation; tell the protector
};

export type Enforcement = { rule: string; passed: boolean; note: string };

export type TrustRequest = {
  id: string;
  trustId: string;
  beneficiaryId: string;
  amount: number;
  reason: string;
  evidence: string;
  createdAt: string;
  decision?: Decision; // what the reasoning said
  checks?: Enforcement[]; // what the fixed rules said
  final: Verdict; // after fixed rules
  paid: number;
  payoutTx?: string;
  payoutError?: string;
  model?: string;
  latencyMs?: number;
};
