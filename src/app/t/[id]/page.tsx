import { notFound } from "next/navigation";
import Flowchart from "@/components/Flowchart";
import AskForm from "@/components/AskForm";
import Decisions from "@/components/Decisions";
import FundPanel from "@/components/FundPanel";
import Activity from "@/components/Activity";
import { getTrust } from "@/lib/store";
import { spentThisYear } from "@/lib/rules";
import { trustState } from "@/lib/trust-state";
import { EXPLORER, NETWORK, TESTNET, USDC, explorerAddress } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export default async function TrustPage({ params }: PageProps<"/t/[id]">) {
  const { id } = await params;
  const trust = await getTrust(id);
  if (!trust) notFound();
  const state = await trustState(trust, { history: true });
  const names = Object.fromEntries(trust.beneficiaries.map((b) => [b.id, b.name]));
  const labels: Record<string, string> = { ...names };
  for (const b of trust.beneficiaries) if (b.wallet) labels[b.wallet.toLowerCase()] = b.name;
  const paidTotal = state.requests.reduce((s, r) => s + (r.paid || 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="text-sm uppercase tracking-widest text-muted">Trust set up by {trust.settlor}</p>
      <h1 className="mt-2 font-serif text-4xl">{trust.name}</h1>

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
          {state.address && (
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
          <h2 className="font-serif text-2xl">Ask the trustee</h2>
          <AskForm
            trustId={trust.id}
            people={trust.beneficiaries.map((b) => ({
              id: b.id,
              name: b.name,
              left: Math.max(0, b.yearlyCap - spentThisYear(state.requests, b.id)),
            }))}
          />
          <h2 className="mt-12 font-serif text-2xl">Every decision</h2>
          <Decisions requests={state.requests} names={names} />
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
