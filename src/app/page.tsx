import Link from "next/link";

const steps = [
  ["Write your wishes", "In your own words: who the money is for, what it may pay for, and what it may not."],
  ["The trustee checks them", "Before any money goes in, it points out gaps, such as what happens when your child turns 18."],
  ["Fund the trust", "Send dollars (USDC) to the trust's own wallet. Only the trustee can pay out, and only to people you named."],
  ["People ask, the trustee decides", "Each request is read against your wishes. It pays, pays part, asks for proof, or says no, and always says why."],
];

const examples = [
  ["School fees, not phones", "“Pay my daughter's school fees straight to the school when an invoice arrives. No gadgets unless the school requires them.”"],
  ["Care for my parents", "“Up to $500 a year for my mother's medical bills, with the bill attached. Groceries up to $60 a month.”"],
  ["Lock for future me", "“I can't touch this until December except for a real medical emergency or to avoid eviction.”"],
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="py-16 md:py-24">
        <p className="text-sm uppercase tracking-widest text-muted">A trustee for everyone</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight md:text-6xl">
          Write your wishes. A trustee keeps them, even when you&apos;re not there to say no.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          Wealthy families have always used trusts to make sure money is spent the way they meant. Deed gives anyone the
          same thing in five minutes: an AI trustee that holds the money and follows your written wishes to the letter.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/start" className="btn">
            Start a trust
          </Link>
          <a href="#how" className="btn-ghost">
            See how it decides
          </a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {examples.map(([title, text]) => (
          <div key={title} className="card p-5">
            <h3 className="font-serif text-xl">{title}</h3>
            <p className="mt-2 text-muted">{text}</p>
          </div>
        ))}
      </section>

      <section id="how" className="py-16">
        <h2 className="font-serif text-3xl">How it works</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-2">
          {steps.map(([title, text], i) => (
            <li key={title} className="flex gap-4">
              <span className="font-serif text-3xl text-seal">{i + 1}</span>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="card mt-10 p-6">
          <h3 className="font-serif text-xl">Two locks on every payment</h3>
          <p className="mt-2 text-muted">
            The trustee reasons about your wishes. Then fixed rules check the result: never more than asked, never above
            your limits, only to addresses you saved. The rules can only make a decision stricter, never looser. A
            protector you choose can always step in.
          </p>
        </div>
      </section>
    </div>
  );
}
