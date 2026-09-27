export type Beneficiary = {
  id: string;
  name: string;
  relation: string;
  wallet?: string; // where payouts go (USDC on Base)
  yearlyCap: number; // hard ceiling per calendar year, in USD
  key?: string; // secret in this person's private link; only they can ask as them
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
  protectorEmail?: string; // alerted when a request tries to override the wishes
  settlorKey?: string; // secret in the settlor's private link
  settlorAddress?: string; // wallet that signed the terms when the trust was made
  settlorSignature?: string;
  signedAt?: string;
  protectorKey?: string; // secret in the protector's private link
  paused?: { at: string; by: "settlor" | "protector" }; // no payouts while set
  demo?: boolean; // made by "Try the demo"; funded from the demo treasury
  deed: string;
  perRequestMax: number;
  liquidBuffer: number; // USD always kept ready for payouts
  beneficiaries: Beneficiary[];
  check?: DeedCheck;
  address?: string; // the trust's own wallet, saved once it exists
  fromBlock?: number; // chain block when the trust was made; history is read from here
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
  protectorAlerted?: boolean; // an email actually went to the protector
  runs?: { verdict: Verdict; amount: number; flagged: boolean }[]; // each independent run
  // A payment the fixed rules held for a person to approve.
  review?: {
    status: "pending" | "approved" | "declined";
    reason: string;
    amount: number;
    by?: "settlor" | "protector";
    at?: string;
  };
  model?: string;
  latencyMs?: number;
};
