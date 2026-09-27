import { notFound } from "next/navigation";
import Flowchart from "@/components/Flowchart";
import AskForm from "@/components/AskForm";
import Decisions from "@/components/Decisions";
import FundPanel from "@/components/FundPanel";
import Activity from "@/components/Activity";
import PauseControl from "@/components/PauseControl";
import ShareLinks from "@/components/ShareLinks";
import { canPause, roleFor } from "@/lib/access";
import { emailConfigured } from "@/lib/notify";
import { getTrust } from "@/lib/store";
import { spentThisYear } from "@/lib/rules";
import { trustState } from "@/lib/trust-state";
import { EXPLORER, NETWORK, TESTNET, USDC, explorerAddress } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export default async function TrustPage({ params, searchParams }: PageProps<"/t/[id]">) {
  const { id } = await params;
  const { k, new: fresh } = await searchParams;
  const key = typeof k === "string" ? k : undefined;
  const trust = await getTrust(id);
  if (!trust) notFound();
  const role = roleFor(trust, key);
  const state = await trustState(trust, { history: true });
  const flagged = state.requests.filter((r) => r.decision?.flagged);
  // A person sees only their own requests; everyone else sees them all.
  const shown = role.kind === "beneficiary" ? state.requests.filter((r) => r.beneficiaryId === role.person.id) : state.requests;
  const left = (bId: string, cap: number) => Math.max(0, cap - spentThisYear(state.requests, bId));
  const roleNote =
    role.kind === "settlor"
      ? "You're viewing as the settlor."
      : role.kind === "protector"
        ? `You're viewing as the protector${trust.protector ? `, ${trust.protector}` : ""}.`
        : role.kind === "beneficiary"
          ? `You're viewing as ${role.person.name}.`
          : role.kind === "public"
            ? "Read-only view. Named people ask the trustee through their own private link."
            : null;
  const names = Object.fromEntries(trust.beneficiaries.map((b) => [b.id, b.name]));
  const labels: Record<string, string> = { ...names };
  for (const b of trust.beneficiaries) if (b.wallet) labels[b.wallet.toLowerCase()] = b.name;
  const paidTotal = state.requests.reduce((s, r) => s + (r.paid || 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="text-sm uppercase tracking-widest text-muted">Trust set up by {trust.settlor}</p>
      <h1 className="mt-2 font-serif text-4xl">{trust.name}</h1>
      {roleNote && <p className="mt-2 text-sm text-muted">{roleNote}</p>}

      {trust.paused && (
        <div className="card mt-6 border-seal p-4 text-seal">
          Payouts are paused by the {trust.paused.by} since {new Date(trust.paused.at).toUTCString()}. The trustee still reads
          requests, but nothing is sent until payouts resume.
        </div>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-muted">Held in trust</p>
          <p className="mt-1 font-serif text-3xl">${state.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
          {state.address ? (
            <p className="mt-2 text-xs text-muted break-all">
              Trust wallet on {TESTNET ? "Base Sepolia" : "Base"}:{" "}
              <a className="underline" href={explorerAddress(state.address)} target="_blank" rel="noreferrer">
                {state.address}
              </a>
              {!TESTNET && state.gas < 0.00001 && (
                <span className="mt-1 block text-seal">Needs a little ETH for network fees before it can pay anyone.</span>
              )}
            </p>
          ) : (
            <p className="mt-2 text-xs text-seal">
              {state.walletError
                ? `The trust's wallet couldn't be reached: ${state.walletError}`
                : "The trust's wallet isn't connected yet, so nothing can be paid out."}
            </p>
          )}
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Paid out so far</p>
          <p className="mt-1 font-serif text-3xl">${paidTotal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
          <p className="mt-2 text-xs text-muted">{state.requests.length} requests decided</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Protector</p>
          <p className="mt-1 font-serif text-2xl">{trust.protector || "None named"}</p>
          <p className="mt-2 text-xs text-muted">Largest single payment: ${trust.perRequestMax.toLocaleString("en-US")}</p>
        </div>
      </section>

      <div className="mt-10 grid gap-8 md:grid-cols-5">
        <div className="md:col-span-3">
          {role.kind === "settlor" && (
            <div className="mb-10">
              <ShareLinks
                fresh={fresh === "1"}
                links={[
                  { label: "You", note: "manage and fund", href: `/t/${trust.id}?k=${trust.settlorKey}` },
                  ...(trust.protectorKey
                    ? [{ label: trust.protector || "Protector", note: "protector: review and pause", href: `/t/${trust.id}?k=${trust.protectorKey}` }]
                    : []),
                  ...trust.beneficiaries
                    .filter((b) => b.key)
                    .map((b) => ({ label: b.name, note: "can ask the trustee", href: `/t/${trust.id}?k=${b.key}` })),
                ]}
              />
            </div>
          )}

          {canPause(role) && (
            <div className="card mb-10 p-5">
              <h3 className="font-medium">{role.kind === "protector" ? "Your role as protector" : "Step in"}</h3>
              <p className="mt-1 text-sm text-muted">
                {flagged.length > 0
                  ? `${flagged.length} request${flagged.length > 1 ? "s" : ""} tried to override the wishes and ${flagged.length > 1 ? "were" : "was"} stopped. They're marked below.`
                  : "No request has tried to override the wishes so far."}{" "}
                {trust.protectorEmail && emailConfigured()
                  ? `The protector is emailed at ${trust.protectorEmail} when that happens.`
                  : "Stopped requests are listed here for the protector to review."}
              </p>
              <div className="mt-3">
                <PauseControl trustId={trust.id} accessKey={key} paused={Boolean(trust.paused)} />
              </div>
            </div>
          )}

          {state.address && role.kind !== "beneficiary" && role.kind !== "protector" && (
            <div className="mb-10">
              <FundPanel
                trustId={trust.id}
                address={state.address}
                network={NETWORK}
                usdc={USDC}
                testnet={TESTNET}
                explorer={EXPLORER}
              />
            </div>
          )}

          {role.kind === "beneficiary" && (
            <>
              <h2 className="font-serif text-2xl">Ask the trustee</h2>
              <AskForm
                trustId={trust.id}
                accessKey={key}
                people={[{ id: role.person.id, name: role.person.name, left: left(role.person.id, role.person.yearlyCap) }]}
              />
            </>
          )}
          {role.kind === "legacy" && (
            <>
              <h2 className="font-serif text-2xl">Ask the trustee</h2>
              <AskForm
                trustId={trust.id}
                people={trust.beneficiaries.map((b) => ({ id: b.id, name: b.name, left: left(b.id, b.yearlyCap) }))}
              />
            </>
          )}

          <h2 className={`${role.kind === "beneficiary" || role.kind === "legacy" ? "mt-12 " : ""}font-serif text-2xl`}>
            {role.kind === "beneficiary" ? "Your requests" : "Every decision"}
          </h2>
          <Decisions requests={shown} names={names} />
          <h2 className="mt-12 font-serif text-2xl">Money in and out</h2>
          <Activity transfers={state.transfers} requests={state.requests} labels={labels} error={state.historyError} />
        </div>
        <aside className="md:col-span-2">
          <h2 className="font-serif text-2xl">The wishes</h2>
          <div className="card mt-3 whitespace-pre-wrap p-5 font-serif leading-relaxed">{trust.deed}</div>
          {trust.check && (
            <>
              <h3 className="mt-6 font-medium">How the trustee decides</h3>
              <div className="card mt-2 p-3">
                <Flowchart source={trust.check.flowchart} />
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
