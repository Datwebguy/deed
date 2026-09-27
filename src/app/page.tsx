import Link from "next/link";
import DeletedNotice from "@/components/DeletedNotice";
import Headline from "@/components/home/Headline";
import HeroDemo from "@/components/home/HeroDemo";
import Locks from "@/components/home/Locks";
import ProtectorDemo from "@/components/home/ProtectorDemo";
import ScrollText from "@/components/home/ScrollText";
import Story from "@/components/home/Story";
import Reveal from "@/components/ui/Reveal";

const EXAMPLES = [
  {
    template: "Education fund",
    title: "School fees, not phones",
    quote: "Pay school fees when an invoice arrives. No gadgets.",
  },
  {
    template: "Support for my parents",
    title: "Care for my parents",
    quote: "Medical bills up to $1,200 a year. Groceries $60 a month.",
  },
  {
    template: "Lock for future me",
    title: "Lock it from future me",
    quote: "Locked until December, except emergencies.",
  },
];

export default function Home() {
  return (
    <div className="overflow-x-clip">
      <DeletedNotice />
      {/* ---------- Hero ---------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <Reveal y={10}>
            <p className="chip">
              <span className="live-dot" /> An AI trustee for everyone
            </p>
          </Reveal>
          <Headline
            text="Your wishes, *kept.* Even when you're not there to say no."
            className="mt-6 font-serif text-[2.7rem] leading-[1.02] sm:text-6xl lg:text-7xl"
          />
          <Reveal delay={0.6}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Write how your money should be used. An AI trustee holds it and pays only what your wishes allow.
            </p>
          </Reveal>
          <Reveal delay={0.75}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/start" className="btn-seal px-6 py-3.5 text-base">
                Start a trust, free
                <span aria-hidden>→</span>
              </Link>
              <a href="#how" className="btn-ghost px-5 py-3.5">
                See how it decides
              </a>
            </div>
            <p className="mt-5 text-xs text-muted">5 minutes · no lawyer · free test money</p>
          </Reveal>
        </div>
        <Reveal delay={0.3} y={40}>
          <HeroDemo />
        </Reveal>
      </section>

      {/* ---------- Built on ---------- */}
      <section className="border-y border-rule/70 bg-paper-2/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-5 text-sm text-muted sm:px-6">
          <span className="eyebrow">Built on</span>
          <span>SERV reasoning</span>
          <span className="text-gold">✦</span>
          <span>Coinbase AgentKit</span>
          <span className="text-gold">✦</span>
          <span>USDC on Base</span>
          <span className="text-gold">✦</span>
          <span>Pay with Base</span>
        </div>
      </section>

      {/* ---------- Why ---------- */}
      <section className="mx-auto max-w-4xl px-4 py-28 sm:px-6 md:py-40">
        <p className="eyebrow mb-6">Why Deed</p>
        <ScrollText
          className="font-serif text-3xl leading-[1.25] sm:text-4xl md:text-5xl"
          text="Trusts make sure money is spent the way you meant. They cost thousands, so few people have one. *Deed makes one in five minutes."
        />
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6">
        <Reveal>
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 max-w-2xl font-serif text-4xl sm:text-5xl">Four steps. No lawyer.</h2>
        </Reveal>
        <div className="mt-10">
          <Story />
        </div>
      </section>

      {/* ---------- Two locks ---------- */}
      <section id="locks" className="scroll-mt-20 border-t border-rule/70 bg-paper-2/40">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
          <Reveal>
            <p className="eyebrow">Safeguards</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl sm:text-5xl">Two locks on every payment.</h2>
            <p className="mt-4 max-w-2xl text-lg text-muted">The AI decides. Fixed rules check it. Rules can only make it stricter.</p>
          </Reveal>
          <div className="mt-12">
            <Locks />
          </div>
        </div>
      </section>

      {/* ---------- Protector ---------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 md:grid-cols-2 md:py-32">
        <Reveal>
          <p className="eyebrow">The protector</p>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl">A person you trust can step in.</h2>
          <p className="mt-4 text-lg text-muted">
            Trick requests are stopped and your protector is alerted. One tap pauses every payout. They can&apos;t take the
            money.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <ProtectorDemo />
        </Reveal>
      </section>

      {/* ---------- Examples ---------- */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Reveal>
          <p className="eyebrow">Start from an example</p>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl">What would you ask it to keep?</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {EXAMPLES.map((e, i) => (
            <Reveal key={e.title} delay={i * 0.1}>
              <Link
                href={`/start?template=${encodeURIComponent(e.template)}`}
                className="card group flex h-full flex-col p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
              >
                <h3 className="font-serif text-2xl">{e.title}</h3>
                <p className="mt-3 flex-1 font-serif text-lg italic leading-snug text-muted">“{e.quote}”</p>
                <span className="mt-6 text-sm font-medium text-seal">
                  Use this <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Final call ---------- */}
      <section className="px-4 pb-24 sm:px-6">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-ink px-6 py-16 text-center text-paper sm:py-24">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_srgb,var(--seal)_45%,transparent),transparent)]" />
            <h2 className="relative mx-auto max-w-3xl font-serif text-4xl sm:text-6xl">
              Write your wishes. <span className="italic">We&apos;ll keep them.</span>
            </h2>
            <p className="relative mx-auto mt-5 max-w-xl text-paper/70">Free test money. Nothing to install.</p>
            <Link href="/start" className="btn-seal relative mt-8 px-7 py-4 text-base">
              Start a trust <span aria-hidden>→</span>
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
