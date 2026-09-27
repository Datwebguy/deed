import { randomBytes, timingSafeEqual } from "crypto";
import type { Beneficiary, Trust } from "./types";

// Who is looking at a trust, decided by the secret in their private link.
// Trusts made before private links existed stay open to everyone.

export const newKey = () => randomBytes(18).toString("base64url");

const same = (a?: string | null, b?: string) =>
  Boolean(a && b && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b)));

export type Role =
  | { kind: "settlor" }
  | { kind: "protector" }
  | { kind: "beneficiary"; person: Beneficiary }
  | { kind: "public" }
  | { kind: "legacy" };

export function roleFor(t: Trust, key?: string | null): Role {
  if (!t.settlorKey) return { kind: "legacy" };
  if (same(key, t.settlorKey)) return { kind: "settlor" };
  if (same(key, t.protectorKey)) return { kind: "protector" };
  const person = t.beneficiaries.find((b) => same(key, b.key));
  return person ? { kind: "beneficiary", person } : { kind: "public" };
}

// Settlor and protector (and anyone on a legacy trust) can pause payouts.
export const canPause = (r: Role) => r.kind === "settlor" || r.kind === "protector" || r.kind === "legacy";
