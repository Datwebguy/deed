"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Flowchart from "@/components/Flowchart";
import type { DeedCheck } from "@/lib/types";

type Person = { name: string; relation: string; wallet: string; yearlyCap: string };

const TEMPLATES: Record<string, { name: string; deed: string; people: Person[]; perRequestMax: string }> = {
  "Education fund": {
    name: "Ada's education fund",
    perRequestMax: "1500",
    deed: `This trust is for my daughter Ada's education until she finishes secondary school.
1. School fees: pay the school's invoice in full when Ada or the school sends it. The invoice must show the school's name, the term and the amount.
2. Books, uniforms and exam fees: up to $300 per school year, with a receipt or the school's list.
3. Devices such as phones, tablets or laptops: only if the school's written list requires one, and at most $600 once every two years.
4. Pocket money: $40 per month, nothing more.
5. Medical emergencies for Ada: pay hospital bills with the bill attached.
6. Never pay for anything else, however it is described. If money runs short, school fees come first.`,
    people: [{ name: "Ada", relation: "daughter", wallet: "", yearlyCap: "4000" }],
  },
  "Support for my parents": {
    name: "Care for Mum and Dad",
    perRequestMax: "500",
    deed: `This trust supports my parents, Grace and Samuel, while I live abroad.
1. Groceries and household costs: up to $60 per month for each of them.
2. Medical care: doctor, hospital and medicine bills, with the bill or prescription attached. Up to $1,200 per year each.
3. Home repairs that affect safety (roof, electrics, water): up to $400 per year, with a quote from the person doing the work.
4. Do not pay for loans to other relatives, business ideas, or gifts, even if my parents ask.
5. If both ask for more than the trust can pay in a month, medical care comes first.`,
    people: [
      { name: "Grace", relation: "mother", wallet: "", yearlyCap: "2500" },
      { name: "Samuel", relation: "father", wallet: "", yearlyCap: "2500" },
    ],
  },
  "Lock for future me": {
    name: "Future me",
    perRequestMax: "1000",
    deed: `This money is locked for my future self until 31 December.
1. Before then I may take money out only for: a medical emergency for me or my children (with the bill), or rent if my landlord has served notice (with the notice).
2. Never for gadgets, holidays, betting, investments that promise high returns, or lending to friends, however I explain it.
3. Early withdrawals are at most half of what is in the trust.
4. After 31 December, pay me whatever I ask for.`,
    people: [{ name: "Me", relation: "myself", wallet: "", yearlyCap: "10000" }],
  },
};

export default function Start() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [settlor, setSettlor] = useState("");
  const [protector, setProtector] = useState("");
  const [deed, setDeed] = useState("");
  const [perRequestMax, setPerRequestMax] = useState("500");
  const [people, setPeople] = useState<Person[]>([{ name: "", relation: "", wallet: "", yearlyCap: "1000" }]);
  const [check, setCheck] = useState<DeedCheck | null>(null);
  const [busy, setBusy] = useState<"" | "check" | "create">("");
  const [error, setError] = useState("");

  const applyTemplate = (k: string) => {
    const t = TEMPLATES[k];
    setName(t.name);
    setDeed(t.deed);
    setPeople(t.people.map((p) => ({ ...p })));
    setPerRequestMax(t.perRequestMax);
    setCheck(null);
  };

  const setPerson = (i: number, patch: Partial<Person>) =>
    setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function runCheck() {
    setBusy("check");
    setError("");
    try {
      const res = await fetch("/api/check", { method: "POST", body: JSON.stringify({ deed }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCheck(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function create() {
    setBusy("create");
    setError("");
    try {
      const res = await fetch("/api/trusts", {
        method: "POST",
        body: JSON.stringify({ name, settlor, protector, deed, perRequestMax, beneficiaries: people, check }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/t/${data.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }

  const ready = name && settlor && deed.length >= 40 && people.every((p) => p.name && Number(p.yearlyCap) > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-4xl">Start a trust</h1>
      <p className="mt-2 text-muted">Pick an example to begin, or write your own.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.keys(TEMPLATES).map((k) => (
          <button key={k} className="btn-ghost text-sm" onClick={() => applyTemplate(k)}>
            {k}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm">Name of the trust</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Your name</span>
          <input className="field" value={settlor} onChange={(e) => setSettlor(e.target.value)} />
        </label>
      </div>

      <label className="mt-6 grid gap-1">
        <span className="text-sm">Your wishes, in your own words</span>
        <textarea
          className="field min-h-64 font-serif text-lg leading-relaxed"
          value={deed}
          onChange={(e) => {
            setDeed(e.target.value);
            setCheck(null);
          }}
          placeholder="Who is this money for? What may it pay for, and what not? Are there limits?"
        />
      </label>

      <div className="mt-4 flex items-center gap-3">
        <button className="btn" disabled={deed.length < 40 || busy !== ""} onClick={runCheck}>
          {busy === "check" ? "Reading your wishes…" : "Check my wishes"}
        </button>
        <span className="text-sm text-muted">Finds gaps before any money goes in.</span>
      </div>

      {check && (
        <section className="card mt-6 p-5">
          <p className="font-serif text-lg">{check.summary}</p>
          {check.gaps.length === 0 ? (
            <p className="mt-3 text-leaf">No gaps found.</p>
          ) : (
            <>
              <h2 className="mt-4 font-medium">
                {check.gaps.length} {check.gaps.length === 1 ? "thing" : "things"} to settle now, so nobody argues later
              </h2>
              <ul className="mt-3 grid gap-3">
                {check.gaps.map((g, i) => (
                  <li key={i} className="border-l-2 border-amber pl-3">
                    <p className="font-medium">{g.issue}</p>
                    <p className="text-muted">{g.question}</p>
                    <button className="mt-1 text-left text-sm underline" onClick={() => setDeed((d) => `${d.trim()}\n${g.suggestion}`)}>
                      Add: “{g.suggestion}”
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h2 className="mt-6 font-medium">How your trustee will decide</h2>
          <div className="mt-3">
            <Flowchart source={check.flowchart} />
          </div>
        </section>
      )}

      <h2 className="mt-10 font-serif text-2xl">Who the money is for</h2>
      <div className="mt-3 grid gap-4">
        {people.map((p, i) => (
          <div key={i} className="card grid gap-3 p-4 md:grid-cols-4">
            <input className="field" placeholder="Name" value={p.name} onChange={(e) => setPerson(i, { name: e.target.value })} />
            <input className="field" placeholder="Relation" value={p.relation} onChange={(e) => setPerson(i, { relation: e.target.value })} />
            <label className="grid gap-1 md:col-span-2">
              <input
                className="field"
                placeholder="Their wallet address for payouts (0x…)"
                value={p.wallet}
                onChange={(e) => setPerson(i, { wallet: e.target.value.trim() })}
              />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs text-muted">Most they can receive in a year ($)</span>
              <input className="field" inputMode="decimal" value={p.yearlyCap} onChange={(e) => setPerson(i, { yearlyCap: e.target.value })} />
            </label>
          </div>
        ))}
        <button className="btn-ghost w-fit text-sm" onClick={() => setPeople((ps) => [...ps, { name: "", relation: "", wallet: "", yearlyCap: "1000" }])}>
          Add a person
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm">Largest single payment ($)</span>
          <input className="field" inputMode="decimal" value={perRequestMax} onChange={(e) => setPerRequestMax(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Protector (someone you trust to step in, optional)</span>
          <input className="field" value={protector} onChange={(e) => setProtector(e.target.value)} />
        </label>
      </div>

      {error && <p className="mt-6 text-seal">{error}</p>}
      <button className="btn mt-8" disabled={!ready || busy !== ""} onClick={create}>
        {busy === "create" ? "Creating…" : "Create the trust"}
      </button>
      {!check && ready && <p className="mt-2 text-sm text-muted">Tip: check your wishes first.</p>}
    </div>
  );
}
