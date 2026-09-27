import { keccak256, toBytes } from "viem";

// The statement the settlor signs with their wallet to create a trust. Built
// the same way in the browser and on the server, so the server can check the
// signature covers exactly what is being saved.

export type SignedTerms = {
  name: string;
  settlor: string;
  deed: string;
  perRequestMax: number;
  protector?: string;
  beneficiaries: { name: string; wallet: string; yearlyCap: number }[];
  issuedAt: string;
};

export function deedMessage(t: SignedTerms) {
  const people = t.beneficiaries.map((b) => `- ${b.name}: ${b.wallet.toLowerCase()} (up to $${b.yearlyCap} a year)`).join("\n");
  return `Deed: I am setting up this trust and I confirm these wishes.

Trust: ${t.name}
Settlor: ${t.settlor}
Wishes fingerprint: ${keccak256(toBytes(t.deed))}
Pays only to:
${people}
Largest single payment: $${t.perRequestMax}
Protector: ${t.protector || "none"}
Signed at: ${t.issuedAt}`;
}
