"use client";

import { AnimatePresence, motion, useInView, useScroll, useSpring } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import CountUp from "@/components/ui/CountUp";

// "How it works" as a scroll story: the steps scroll on the left while the
// picture on the right stays pinned and changes to match. On phones each step
// carries its own picture inline.

const STEPS = [
  {
    title: "Write and sign",
    body: "Your wishes in plain words, signed with your wallet.",
  },
  {
    title: "The trustee checks them",
    body: "It flags gaps before any money goes in.",
  },
  {
    title: "Fund the trust",
    body: "Send USDC with a passkey. Only the trustee can pay out.",
  },
  {
    title: "People ask. It decides.",
    body: "Decided 3 times, checked in code. Unsure? A person reviews.",
  },
];

export default function Story() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.6", "end 0.6"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <div ref={ref} className="relative grid gap-10 md:grid-cols-2 md:gap-16">
      <div className="relative">
        {/* Progress rail */}
        <div className="absolute top-2 bottom-2 left-[15px] hidden w-px bg-rule md:block">
          <motion.div className="w-px origin-top bg-seal" style={{ scaleY: progress, height: "100%" }} />
        </div>
        {STEPS.map((s, i) => (
          <Step key={s.title} index={i} active={active === i} onEnter={() => setActive(i)} {...s}>
            <div className="mt-6 md:hidden">
              <WhenSeen step={i} />
            </div>
          </Step>
        ))}
      </div>
      <div className="hidden md:block">
        <div className="sticky top-28 h-[440px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              <Visual step={active} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Step({
  index,
  title,
  body,
  active,
  onEnter,
  children,
}: {
  index: number;
  title: string;
  body: string;
  active: boolean;
  onEnter: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onEnter();
  }, [inView, onEnter]);

  return (
    <div ref={ref} className="relative py-8 md:flex md:min-h-[62vh] md:items-center md:py-0 md:pl-14">
      <div>
        <span
          className={`mb-4 grid size-8 place-items-center rounded-full border font-mono text-xs transition-all duration-500 md:absolute md:top-1/2 md:left-0 md:mb-0 md:-translate-y-1/2 ${
            active ? "border-seal bg-seal text-paper" : "border-rule bg-paper text-muted"
          }`}
        >
          {index + 1}
        </span>
        <h3
          className={`font-serif text-3xl transition-opacity duration-500 md:text-4xl ${active ? "opacity-100" : "md:opacity-40"}`}
        >
          {title}
        </h3>
        <p className={`mt-3 max-w-md text-lg text-muted transition-opacity duration-500 ${active ? "" : "md:opacity-50"}`}>
          {body}
        </p>
        {children}
      </div>
    </div>
  );
}

// On phones each picture starts playing only once it scrolls into view.
function WhenSeen({ step }: { step: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  return (
    <div ref={ref} className="min-h-[380px]">
      {seen && <Visual step={step} />}
    </div>
  );
}

/* ---------------- The four pictures ---------------- */

function Visual({ step }: { step: number }) {
  return (
    <div className="card h-full overflow-hidden p-6">
      {step === 0 && <WishesVisual />}
      {step === 1 && <CheckVisual />}
      {step === 2 && <FundVisual />}
      {step === 3 && <DecideVisual />}
    </div>
  );
}

const WISHES = [
  "This trust is for my daughter Ada's education.",
  "1. School fees: pay the school's invoice in full.",
  "2. Books and uniforms: up to $300 a school year.",
  "3. Devices only if the school's list requires one.",
  "4. Pocket money: $40 a month, nothing more.",
];

function WishesVisual() {
  return (
    <div className="flex h-full flex-col">
      <p className="eyebrow">Example · the wishes</p>
      <div className="mt-5 grid gap-3 font-serif text-lg leading-snug">
        {WISHES.map((line, i) => (
          <motion.p
            key={line}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.35, duration: 0.5 }}
          >
            {line}
          </motion.p>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.1 }}
        className="mt-auto flex items-center gap-3 border-t border-rule pt-4 text-sm text-muted"
      >
        <span className="font-serif text-2xl italic text-ink">Ebere O.</span> signed, 27 Sept
      </motion.div>
    </div>
  );
}

const GAPS = [
  ["What happens when Ada turns 18?", "The trust ends when Ada turns 25 or finishes university."],
  ["What counts as a medical emergency?", "A hospital or doctor's bill for Ada, with the bill attached."],
];

function CheckVisual() {
  return (
    <div className="flex h-full flex-col">
      <p className="eyebrow">Example · 2 gaps found</p>
      <div className="mt-5 grid gap-3">
        {GAPS.map(([q, a], i) => (
          <motion.div
            key={q}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.4 }}
            className="rounded-2xl border border-amber/40 bg-amber-soft/60 p-4"
          >
            <p className="font-medium">{q}</p>
            <p className="mt-1 text-sm text-muted">
              Suggested: <span className="font-serif italic text-ink-2">“{a}”</span>
            </p>
          </motion.div>
        ))}
      </div>
      <svg viewBox="0 0 300 70" className="mt-auto w-full">
        {[
          [10, "Request"],
          [110, "Clause?"],
          [210, "Pay / No"],
        ].map(([x, label], i) => (
          <g key={label as string}>
            <motion.rect
              x={x as number}
              y="18"
              width="80"
              height="34"
              rx="10"
              style={{ fill: "var(--card)", stroke: "var(--rule)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 + i * 0.3 }}
            />
            <motion.text
              x={(x as number) + 40}
              y="39"
              textAnchor="middle"
              fontSize="11"
              style={{ fill: "var(--ink)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 + i * 0.3 }}
            >
              {label}
            </motion.text>
          </g>
        ))}
        {[90, 190].map((x, i) => (
          <motion.path
            key={x}
            d={`M${x} 35 H${x + 20}`}
            style={{ stroke: "var(--seal)" }}
            strokeWidth="1.5"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1.4 + i * 0.3, duration: 0.4 }}
          />
        ))}
      </svg>
    </div>
  );
}

function FundVisual() {
  return (
    <div className="flex h-full flex-col">
      <p className="eyebrow">Example · held in trust</p>
      <p className="mt-3 font-serif text-6xl">
        <CountUp value={4210} prefix="$" duration={1.8} />
      </p>
      <p className="mt-2 font-mono text-xs text-muted">USDC · 0x7a1c…9e04 · Base</p>
      <div className="mt-6 grid gap-2">
        {[
          ["Ebere · Pay with Base", "+$4,000"],
          ["Ebere · Pay with Base", "+$210"],
        ].map(([who, amt], i) => (
          <motion.div
            key={amt}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.3 }}
            className="flex items-center justify-between rounded-xl bg-paper-2 px-4 py-3 text-sm"
          >
            <span>{who}</span>
            <span className="font-mono text-leaf">{amt}</span>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-auto flex items-center gap-2 text-sm text-muted"
      >
        <span className="live-dot" /> Only the trustee can move this money.
      </motion.div>
    </div>
  );
}

const REQUESTS = [
  ["Term 2 fees · $420", "Paid", "text-leaf bg-leaf-soft"],
  ["Maths textbook · $35", "Needs proof", "text-amber bg-amber-soft"],
  ["New iPhone · $900", "Declined", "text-seal bg-seal-soft"],
] as const;

function DecideVisual() {
  return (
    <div className="flex h-full flex-col">
      <p className="eyebrow">Example · decisions</p>
      <div className="mt-5 grid gap-3">
        {REQUESTS.map(([label, verdict, tone], i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.45 }}
            className="flex items-center justify-between rounded-2xl border border-rule px-4 py-4"
          >
            <span>{label}</span>
            <motion.span
              initial={{ scale: 1.8, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: -3, opacity: 1 }}
              transition={{ delay: 0.45 + i * 0.45, type: "spring", stiffness: 380, damping: 18 }}
              className={`stamp ${tone}`}
            >
              {verdict}
            </motion.span>
          </motion.div>
        ))}
      </div>
      <p className="mt-auto border-l-2 border-gold pl-3 font-serif text-sm italic text-muted">
        “Devices: only if the school&apos;s written list requires one.”
      </p>
    </div>
  );
}
