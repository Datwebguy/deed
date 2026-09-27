"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Flowchart from "@/components/Flowchart";
import Seal from "@/components/ui/Seal";
import Thinking from "@/components/ui/Thinking";
import { currentAccount, preloadBaseAccount } from "@/lib/browser-wallet";
import { TEMPLATES, type Person } from "@/lib/templates";
import type { DeedCheck } from "@/lib/types";

const STEPS = ["Your wishes", "Check", "People", "Safeguards", "Review"];
const blankPerson = (): Person => ({ name: "", relation: "", wallet: "", yearlyCap: "1000" });
const looksLikeAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a);

export default function Start() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [template, setTemplate] = useState("");
  const [name, setName] = useState("");
  const [settlor, setSettlor] = useState("");
  const [deed, setDeed] = useState("");
  const [people, setPeople] = useState<Person[]>([blankPerson()]);
  const [perRequestMax, setPerRequestMax] = useState("500");
  const [protector, setProtector] = useState("");
  const [protectorEmail, setProtectorEmail] = useState("");
  const [check, setCheck] = useState<DeedCheck | null>(null);
  const [checkedDeed, setCheckedDeed] = useState("");
  const [added, setAdded] = useState<number[]>([]);
  const [busy, setBusy] = useState<"" | "check" | "create">("");
  const [error, setError] = useState("");

  const applyTemplate = (k: string) => {
    const t = TEMPLATES[k];
    if (!t) return;
    setTemplate(k);
    setName(t.name);
    setDeed(t.deed);
    setPeople(t.people.map((p) => ({ ...p })));
    setPerRequestMax(t.perRequestMax);
    setCheck(null);
    setAdded([]);
  };

  useEffect(() => {
    preloadBaseAccount().catch(() => {});
    // Arriving from an example on the home page.
    const k = new URLSearchParams(window.location.search).get("template");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (k) applyTemplate(k);
  }, []);

  const setPerson = (i: number, patch: Partial<Person>) =>
    setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function fillFromMyWallet(i: number) {
    setError("");
    try {
      // A wallet address is the same on every network, so any chain works here.
      setPerson(i, { wallet: await currentAccount("base") });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function runCheck() {
    setBusy("check");
    setError("");
    try {
      const res = await fetch("/api/check", { method: "POST", body: JSON.stringify({ deed }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCheck(data);
      setCheckedDeed(deed);
      setAdded([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  function addSuggestion(i: number, text: string) {
    setDeed((d) => `${d.trimEnd()}\n${text}`);
    setAdded((a) => [...a, i]);
  }

  async function create() {
    setBusy("create");
    setError("");
    try {
      const res = await fetch("/api/trusts", {
        method: "POST",
        body: JSON.stringify({ name, settlor, protector, protectorEmail, deed, perRequestMax, beneficiaries: people, check }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/t/${data.id}?k=${data.key}&new=1`);
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }

  // What still stands between each step and the next.
  const blockers: (string | null)[] = [
    !name.trim() ? "Give the trust a name." : !settlor.trim() ? "Add your name." : deed.trim().length < 40 ? "Write a few sentences of wishes." : null,
    null,
    people.some((p) => !p.name.trim())
      ? "Each person needs a name."
      : people.some((p) => !(Number(p.yearlyCap) > 0))
        ? "Each person needs a yearly limit above zero."
        : people.some((p) => p.wallet && !looksLikeAddress(p.wallet))
          ? "A payout address doesn't look right (0x followed by 40 characters)."
          : null,
    !(Number(perRequestMax) > 0)
      ? "Set the largest single payment."
      : protectorEmail && !/^\S+@\S+\.\S+$/.test(protectorEmail)
        ? "The protector's email doesn't look right."
        : null,
    null,
  ];

  const go = (to: number) => {
    setError("");
    setDir(to > step ? 1 : -1);
    setStep(to);
    // Check automatically the first time the settlor reaches the check step.
    if (to === 1 && !check && busy === "" && deed.trim().length >= 40) runCheck();
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };


  const stale = check && checkedDeed !== deed && added.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-24 sm:px-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <p className="eyebrow">
          Step {step + 1} of {STEPS.length}
        </p>
        <p className="text-sm text-muted">{STEPS[step]}</p>
      </div>
      <div className="mt-3 flex gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            aria-label={`Go to ${s}`}
            disabled={i > step && blockers.slice(0, i).some(Boolean)}
            onClick={() => go(i)}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-rule/60 disabled:cursor-not-allowed"
          >
            <motion.span
              className="block h-full rounded-full bg-seal"
              initial={false}
              animate={{ width: i <= step ? "100%" : "0%" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </button>
        ))}
      </div>

      <div className="relative mt-10">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.section
            key={step}
            custom={dir}
            initial={reduce ? false : { opacity: 0, x: 40 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -40 * dir }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 && (
              <>
                <h1 className="font-serif text-4xl sm:text-5xl">What should your money be for?</h1>
                <p className="mt-3 text-lg text-muted">Write it the way you&apos;d explain it to a trusted friend. Or start from an example.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {Object.keys(TEMPLATES).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => applyTemplate(k)}
                      className={`card flex flex-col items-start justify-start p-4 text-left transition hover:-translate-y-0.5 ${template === k ? "!border-seal ring-2 ring-seal/20" : ""}`}
                    >
                      <span className="font-medium">{k}</span>
                      <span className="mt-1 line-clamp-3 text-xs text-muted">{TEMPLATES[k].deed}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <Field label="Name of the trust">
                    <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada's education fund" />
                  </Field>
                  <Field label="Your name">
                    <input className="field" value={settlor} onChange={(e) => setSettlor(e.target.value)} placeholder="Ebere Okafor" />
                  </Field>
                </div>
                <Field label="Your wishes, in your own words" className="mt-4">
                  <textarea
                    className="field min-h-72 font-serif text-lg leading-relaxed"
                    value={deed}
                    onChange={(e) => setDeed(e.target.value)}
                    placeholder="Who is this money for? What may it pay for, and what not? Are there limits?"
                  />
                  <span className="mt-1 text-right text-xs text-muted">{deed.trim().length} characters</span>
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="font-serif text-4xl sm:text-5xl">Let the trustee read them first.</h1>
                <p className="mt-3 text-lg text-muted">
                  Before any money goes in, it looks for gaps that would leave it unsure later, and shows how it will decide.
                </p>
                {busy === "check" ? (
                  <Thinking steps={["Reading your wishes", "Looking for gaps", "Drawing how it will decide"]} />
                ) : check ? (
                  <div className="mt-8 grid gap-4">
                    <p className="border-l-2 border-gold pl-3 font-serif text-lg italic">{check.summary}</p>
                    {check.gaps.length === 0 ? (
                      <p className="card p-5 text-leaf">No gaps found. Your wishes are clear enough to follow.</p>
                    ) : (
                      check.gaps.map((g, i) => (
                        <motion.div
                          key={g.issue}
                          initial={reduce ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="card p-5"
                        >
                          <p className="font-medium">{g.issue}</p>
                          <p className="mt-1 text-sm text-muted">{g.question}</p>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper-2 px-4 py-3">
                            <span className="font-serif italic text-ink-2">“{g.suggestion}”</span>
                            <button
                              type="button"
                              className={added.includes(i) ? "chip !text-leaf" : "btn-ghost !py-1.5 text-sm"}
                              disabled={added.includes(i)}
                              onClick={() => addSuggestion(i, g.suggestion)}
                            >
                              {added.includes(i) ? "✓ Added" : "Add to my wishes"}
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                    <div className="card p-4">
                      <p className="eyebrow mb-3">How your trustee will decide</p>
                      <Flowchart source={check.flowchart} />
                    </div>
                    {stale && (
                      <button type="button" className="btn-ghost w-fit text-sm" onClick={runCheck}>
                        Your wishes changed. Check again
                      </button>
                    )}
                  </div>
                ) : (
                  <button type="button" className="btn mt-8" onClick={runCheck}>
                    Check my wishes
                  </button>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="font-serif text-4xl sm:text-5xl">Who is the money for?</h1>
                <p className="mt-3 text-lg text-muted">
                  Each person gets a private link to ask the trustee. Payouts go only to the address you save here.
                </p>
                <div className="mt-8 grid gap-4">
                  <AnimatePresence initial={false}>
                    {people.map((p, i) => (
                      <motion.div
                        key={i}
                        layout
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className="card grid gap-3 p-5 sm:grid-cols-2"
                      >
                        <Field label="Name">
                          <input className="field" value={p.name} onChange={(e) => setPerson(i, { name: e.target.value })} placeholder="Ada" />
                        </Field>
                        <Field label="Relation">
                          <input className="field" value={p.relation} onChange={(e) => setPerson(i, { relation: e.target.value })} placeholder="daughter" />
                        </Field>
                        <Field label="Payout wallet (USDC on Base)" className="sm:col-span-2">
                          <div className="flex gap-2">
                            <input
                              className="field font-mono text-sm"
                              value={p.wallet}
                              onChange={(e) => setPerson(i, { wallet: e.target.value.trim() })}
                              placeholder="0x…"
                            />
                            <button type="button" className="btn-ghost shrink-0 text-sm" onClick={() => fillFromMyWallet(i)}>
                              Use my wallet
                            </button>
                          </div>
                          {!p.wallet && <span className="mt-1 text-xs text-muted">Without an address the trustee can decide, but can&apos;t send.</span>}
                        </Field>
                        <Field label="Most they can receive in a year ($)">
                          <input className="field" inputMode="decimal" value={p.yearlyCap} onChange={(e) => setPerson(i, { yearlyCap: e.target.value })} />
                        </Field>
                        {people.length > 1 && (
                          <button
                            type="button"
                            className="self-end justify-self-end text-sm text-muted underline-offset-2 hover:text-seal hover:underline"
                            onClick={() => setPeople((ps) => ps.filter((_, j) => j !== i))}
                          >
                            Remove {p.name || "this person"}
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <button type="button" className="btn-ghost w-fit" onClick={() => setPeople((ps) => [...ps, blankPerson()])}>
                    + Add a person
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h1 className="font-serif text-4xl sm:text-5xl">Set the safeguards.</h1>
                <p className="mt-3 text-lg text-muted">Fixed rules the trustee can never break, and a person who can step in.</p>
                <div className="mt-8 grid gap-4">
                  <div className="card p-5">
                    <Field label="Largest single payment ($)">
                      <input className="field" inputMode="decimal" value={perRequestMax} onChange={(e) => setPerRequestMax(e.target.value)} />
                    </Field>
                    <p className="mt-2 text-xs text-muted">No single payment can be bigger than this, whatever the trustee decides.</p>
                  </div>
                  <div className="card grid gap-4 p-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <p className="font-medium">A protector (optional)</p>
                      <p className="text-sm text-muted">
                        Someone you trust. They see requests that try to trick the trustee, and can pause every payout. They
                        can&apos;t take money or change your wishes.
                      </p>
                    </div>
                    <Field label="Their name">
                      <input className="field" value={protector} onChange={(e) => setProtector(e.target.value)} placeholder="Grace" />
                    </Field>
                    <Field label="Their email, for alerts">
                      <input
                        className="field"
                        type="email"
                        inputMode="email"
                        value={protectorEmail}
                        onChange={(e) => setProtectorEmail(e.target.value.trim())}
                        placeholder="grace@example.com"
                      />
                    </Field>
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h1 className="font-serif text-4xl sm:text-5xl">Read it once more, then seal it.</h1>
                <div className="card mt-8 overflow-hidden">
                  <div className="border-b border-rule bg-paper-2/60 px-6 py-4">
                    <p className="eyebrow">Deed of trust</p>
                    <p className="mt-1 font-serif text-3xl">{name}</p>
                    <p className="text-sm text-muted">Set up by {settlor}</p>
                  </div>
                  <div className="whitespace-pre-wrap px-6 py-5 font-serif text-lg leading-relaxed">{deed}</div>
                  <div className="gold-rule" />
                  <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
                    <div>
                      <p className="eyebrow mb-2">For</p>
                      <ul className="grid gap-1 text-sm">
                        {people.map((p, i) => (
                          <li key={i}>
                            <span className="font-medium">{p.name}</span>
                            {p.relation && <span className="text-muted"> · {p.relation}</span>}
                            <span className="text-muted"> · up to ${Number(p.yearlyCap).toLocaleString("en-US")}/yr</span>
                            {!p.wallet && <span className="text-amber"> · no payout address</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="eyebrow mb-2">Safeguards</p>
                      <ul className="grid gap-1 text-sm">
                        <li>Largest payment ${Number(perRequestMax).toLocaleString("en-US")}</li>
                        <li>
                          Protector: {protector || "none"}
                          {protectorEmail && <span className="text-muted"> · {protectorEmail}</span>}
                        </li>
                        <li>{check ? `Checked · ${check.gaps.length} gap${check.gaps.length === 1 ? "" : "s"} noted` : "Not checked yet"}</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted">
                  Next you&apos;ll get a private link for yourself and one for each person. Keep yours safe: it&apos;s the only way
                  back in.
                </p>
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      {(error || blockers[step]) && (
        <p className={`mt-6 text-sm ${error ? "text-seal" : "text-muted"}`} role={error ? "alert" : undefined}>
          {error || blockers[step]}
        </p>
      )}

      {/* Navigation */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex items-center justify-between gap-3 border-t border-rule/70 bg-paper/85 px-4 py-4 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        <button type="button" className="btn-ghost" onClick={() => go(step - 1)} disabled={step === 0 || busy !== ""}>
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn" onClick={() => go(step + 1)} disabled={Boolean(blockers[step]) || busy === "check"}>
            {step === 1 && !check ? "Skip for now" : "Continue"} <span aria-hidden>→</span>
          </button>
        ) : (
          <button type="button" className="btn-seal" onClick={create} disabled={busy !== "" || blockers.some(Boolean)}>
            {busy === "create" ? (
              <>
                <Seal className="animate-spin text-lg" /> Sealing…
              </>
            ) : (
              <>
                <Seal className="text-lg" /> Create the trust
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}
