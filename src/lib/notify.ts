import type { Trust, TrustRequest } from "./types";

// Emails the protector when a request tries to override the wishes. Needs
// RESEND_API_KEY (resend.com) and a protector email on the trust; without
// them the request is still stopped and shown on the protector's page.

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export async function alertProtector(t: Trust, r: TrustRequest, who: string, origin: string): Promise<boolean> {
  if (!emailConfigured() || !t.protectorEmail) return false;
  const link = t.protectorKey ? `${origin}/t/${t.id}?k=${t.protectorKey}` : `${origin}/t/${t.id}`;
  const review = r.review?.status === "pending";
  const text = review
    ? `${who} asked "${t.name}" for $${r.amount}. The trustee would pay $${r.review!.amount}, but it needs your review first: ${r.review!.reason}

What they wrote: "${r.reason}"

Approve or decline it here:
${link}

Deed`
    : `${who} sent a request to "${t.name}" that tried to override the settlor's wishes, so the trustee stopped it.

Asked for: $${r.amount}
What they wrote: "${r.reason}"

Nothing was paid. You can review it, and pause all payouts if you need to, here:
${link}

Deed`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Deed <onboarding@resend.dev>",
        to: [t.protectorEmail],
        subject: review ? `Deed: a payment from "${t.name}" needs your review` : `Deed: a request to "${t.name}" was stopped`,
        text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
