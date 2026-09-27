import { Suspense } from "react";
import { notFound } from "next/navigation";
import ActivitySection, { ActivitySkeleton } from "@/components/ActivitySection";
import AskForm from "@/components/AskForm";
import Decisions from "@/components/Decisions";
import Flowchart from "@/components/Flowchart";
import FundPanel from "@/components/FundPanel";
import PauseControl from "@/components/PauseControl";
import SealedBanner from "@/components/SealedBanner";
import ShareLinks from "@/components/ShareLinks";
import CountUp from "@/components/ui/CountUp";
import Reveal from "@/components/ui/Reveal";
import { canPause, roleFor } from "@/lib/access";
import { emailConfigured } from "@/lib/notify";
import { spentThisYear } from "@/lib/rules";
import { getTrust } from "@/lib/store";
import { trustState } from "@/lib/trust-state";
import { verdictOf } from "@/lib/verdict";
import { EXPLORER, NETWORK, TESTNET, USDC, explorerAddress } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export default async function TrustPage({ params, searchParams }: PageProps<"/t/[id]">) {
  const { id } = await params;
  const { k, new: fresh } = await searchParams;
  const key = typeof k === "string" ? k : undefined;
  const trust = await getTrust(id);
  if (!trust) notFound();
  const role = roleFor(trust, key);
  const state = await trustState(trust);

  const flagged = state.requests.filter((r) => r.decision?.flagged);
  // A person sees only their own requests; everyone else sees them all.
  const shown = role.kind === "beneficiary" ? state.requests.filter((r) => r.beneficiaryId === role.person.id) : state.requests;
  const left = (bId: string, cap: number) => Math.max(0, cap - spentThisYear(state.requests, bId));
  const names = Object.fromEntries(trust.beneficiaries.map((b) => [b.id, b.name]));
  const labels: Record<string, string> = { ...names };
  for (const b of trust.beneficiaries) if (b.wallet) labels[b.wallet.toLowerCase()] = b.name;
  const paidTotal = state.requests.reduce((s, r) => s + (r.paid || 0), 0);
  const tally = { leaf: 0, amber: 0, seal: 0 };
  for (const r of state.requests) tally[verdictOf(r).tone]++;

  const roleChip =
    role.kind === "settlor"
      ? "Settlor view"
      : role.kind === "protector"
        ? `Protector · ${trust.protector || "you"}`
        : role.kind === "beneficiary"
          ? `Signed in as ${role.person.name}`
          : role.kind === "public"
            ? "Read-only"
            : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-24 sm:px-6">
      {role.kind === "settlor" && fresh === "1" && <SealedBanner name={trust.name} />}

      {/* ---------- Header ---------- */}
      <Reveal y={12}>
        <p className="eyebrow">Deed of trust · set up by {trust.settlor}</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">{trust.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {roleChip && <span className="chip">{roleChip}</span>}
          <span className="chip">
            <span className="live-dot" /> {TESTNET ? "Base Sepolia · test money" : "Base"}
          </span>
          {trust.paused && <span className="chip !border-seal/50 !text-seal">Payouts paused</span>}
        </div>
        {role.kind === "public" && (
          <p className="mt-3 text-sm text-muted">Named people ask the trustee through their own private link.</p>
        )}
      </Reveal>

      {trust.paused && (
        <div className="mt-6 rounded-2xl border border-seal/40 bg-seal-soft/60 px-5 py-4 text-sm text-seal">
          Payouts were paused by the {trust.paused.by} on {new Date(trust.paused.at).toUTCString()}. The trustee still reads
          requests, but nothing is sent until payouts resume.
        </div>
      )}

      {/* ---------- Numbers ---------- */}
      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card col-span-2 p-5 lg:col-span-1">
          <p className="text-sm text-muted">Held in trust</p>
          <p className="mt-1 font-serif text-4xl">
            <CountUp value={state.balance} decimals={2} prefix="$" />
          </p>
          {state.address ? (
            <a className="mt-2 block truncate font-mono text-xs text-muted hover:text-ink" href={explorerAddress(state.address)} target="_blank" rel="noreferrer">
              {state.address} ↗
            </a>
          ) : (
            <p className="mt-2 text-xs text-seal">
              {state.walletError ? `Wallet unreachable: ${state.walletError}` : "The trust's wallet isn't connected yet."}
            </p>
          )}
          {!TESTNET && state.address && state.gas < 0.00001 && (
            <p className="mt-1 text-xs text-seal">Needs a little ETH for network fees.</p>
          )}
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Paid out</p>
          <p className="mt-1 font-serif text-3xl sm:text-4xl">
            <CountUp value={paidTotal} decimals={2} prefix="$" />
          </p>
          <p className="mt-2 text-xs text-muted">Largest single payment ${trust.perRequestMax.toLocaleString("en-US")}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Decisions</p>
          <p className="mt-1 font-serif text-3xl sm:text-4xl">
            <CountUp value={state.requests.length} />
          </p>
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-rule/60">
            {state.requests.length > 0 &&
              (
                [
                  ["leaf", "bg-leaf"],
                  ["amber", "bg-amber"],
                  ["seal", "bg-seal"],
                ] as const
              ).map(([t, bg]) => <span key={t} className={bg} style={{ width: `${(tally[t] / state.requests.length) * 100}%` }} />)}
          </div>
          <p className="mt-2 text-xs text-muted">
            {tally.leaf} paid · {tally.amber} waiting · {tally.seal} no
          </p>
        </div>
        <div className="card col-span-2 p-5 lg:col-span-1">
          <p className="text-sm text-muted">Protector</p>
          <p className="mt-1 font-serif text-3xl">{trust.protector || "None"}</p>
          <p className="mt-2 text-xs text-muted">
            {flagged.length > 0 ? `${flagged.length} request${flagged.length > 1 ? "s" : ""} stopped` : "Nothing flagged"}
          </p>
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {/* ---------- What this person can do ---------- */}
          {role.kind === "beneficiary" && (
            <section className="mb-12">
              <h2 className="font-serif text-3xl">Ask the trustee</h2>
              <p className="mt-1 text-muted">Say what it&apos;s for and paste your proof. You&apos;ll get an answer, and a reason, in about 20 seconds.</p>
              <AskForm
                trustId={trust.id}
                accessKey={key}
                explorer={EXPLORER}
                people={[{ id: role.person.id, name: role.person.name, left: left(role.person.id, role.person.yearlyCap), cap: role.person.yearlyCap }]}
              />
            </section>
          )}
          {role.kind === "legacy" && (
            <section className="mb-12">
              <h2 className="font-serif text-3xl">Ask the trustee</h2>
              <AskForm
                trustId={trust.id}
                explorer={EXPLORER}
                people={trust.beneficiaries.map((b) => ({ id: b.id, name: b.name, left: left(b.id, b.yearlyCap), cap: b.yearlyCap }))}
              />
            </section>
          )}

          {canPause(role) && (
            <section className="card mb-8 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-md">
                  <h2 className="font-medium">{role.kind === "protector" ? "Your role as protector" : "Step in"}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {flagged.length > 0
                      ? `${flagged.length} request${flagged.length > 1 ? "s" : ""} tried to override the wishes and ${flagged.length > 1 ? "were" : "was"} stopped. They're marked below.`
                      : "No request has tried to override the wishes so far."}{" "}
                    {trust.protectorEmail && emailConfigured()
                      ? `The protector is emailed at ${trust.protectorEmail} when that happens.`
                      : "Stopped requests are listed here for the protector to review."}
                  </p>
                </div>
                <PauseControl trustId={trust.id} accessKey={key} paused={Boolean(trust.paused)} />
              </div>
            </section>
          )}

          {state.address && role.kind !== "beneficiary" && role.kind !== "protector" && (
            <section className="mb-8">
              <FundPanel trustId={trust.id} address={state.address} network={NETWORK} usdc={USDC} testnet={TESTNET} explorer={EXPLORER} />
            </section>
          )}

          {role.kind === "settlor" && (
            <section className="mb-12">
              <ShareLinks
                fresh={fresh === "1"}
                links={[
                  { label: "You", note: "manage and fund", href: `/t/${trust.id}?k=${trust.settlorKey}` },
                  ...(trust.protectorKey
                    ? [{ label: trust.protector || "Protector", note: "review and pause", href: `/t/${trust.id}?k=${trust.protectorKey}` }]
                    : []),
                  ...trust.beneficiaries
                    .filter((b) => b.key)
                    .map((b) => ({ label: b.name, note: "can ask the trustee", href: `/t/${trust.id}?k=${b.key}` })),
                ]}
              />
            </section>
          )}

          {/* ---------- Record ---------- */}
          <section>
            <h2 className="font-serif text-3xl">{role.kind === "beneficiary" ? "Your requests" : "Every decision"}</h2>
            <Decisions requests={shown} names={names} />
          </section>

          <section className="mt-12">
            <h2 className="font-serif text-3xl">Money in and out</h2>
            <p className="mt-1 text-sm text-muted">Read straight from the chain. Every line links to Basescan.</p>
            <Suspense fallback={<ActivitySkeleton />}>
              <ActivitySection address={state.address} fromBlock={trust.fromBlock} requests={state.requests} labels={labels} />
            </Suspense>
          </section>
        </div>

        {/* ---------- The wishes ---------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="border-b border-rule bg-paper-2/60 px-5 py-4">
              <p className="eyebrow">The wishes</p>
              <p className="text-sm text-muted">In {trust.settlor}&apos;s own words. The trustee follows them exactly.</p>
            </div>
            <div className="max-h-[52vh] overflow-y-auto px-5 py-4 font-serif leading-relaxed">
              {trust.deed.split("\n").filter(Boolean).map((line, i) => {
                const m = line.match(/^(\d+)[.)]\s*(.*)$/);
                return m ? (
                  <p key={i} className="mt-2 flex gap-3">
                    <span className="w-5 shrink-0 text-right font-sans text-xs leading-7 text-gold">{m[1]}</span>
                    <span>{m[2]}</span>
                  </p>
                ) : (
                  <p key={i} className="mt-2 first:mt-0">
                    {line}
                  </p>
                );
              })}
            </div>
            {trust.settlorAddress && (
              <p className="flex items-center gap-2 border-t border-rule px-5 py-3 text-xs text-muted">
                <span className="grid size-4 place-items-center rounded-full bg-leaf text-[9px] text-paper">✓</span>
                Signed by {trust.settlor}&apos;s wallet{" "}
                <a className="font-mono hover:text-ink" href={explorerAddress(trust.settlorAddress)} target="_blank" rel="noreferrer">
                  {trust.settlorAddress.slice(0, 6)}…{trust.settlorAddress.slice(-4)}
                </a>
                {trust.signedAt && <span>· {new Date(trust.signedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
              </p>
            )}
            <div className="gold-rule" />
            <div className="grid gap-3 px-5 py-4 text-sm">
              {trust.beneficiaries.map((b) => {
                const l = left(b.id, b.yearlyCap);
                return (
                  <div key={b.id}>
                    <div className="flex justify-between">
                      <span>
                        {b.name} {b.relation && <span className="text-muted">· {b.relation}</span>}
                      </span>
                      <span className="font-mono text-xs text-muted">
                        ${l.toLocaleString("en-US")} / ${b.yearlyCap.toLocaleString("en-US")}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-rule/60">
                      <div className="h-full rounded-full bg-leaf" style={{ width: `${(l / b.yearlyCap) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {trust.check && (
            <details className="card group mt-4 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                How the trustee decides
                <span className="text-muted transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="mt-3">
                <Flowchart source={trust.check.flowchart} />
              </div>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
