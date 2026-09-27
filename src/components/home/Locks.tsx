"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

// Two locks on every payment, played out on one real-looking request.
const RULES = [
  ["Not more than asked", "$300 asked"],
  ["Single payment limit", "$250 max · lowered"],
  ["Ada's yearly limit", "$3,580 left"],
  ["Money the trust holds", "$4,210"],
  ["Saved payout address", "0x51…d0"],
  ["No attempt to override the wishes", "clean"],
];

export default function Locks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const reduce = useReducedMotion();
  const on = inView || reduce;

  return (
    <div ref={ref} className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
      <motion.div
        initial={reduce ? false : { opacity: 0, x: -20 }}
        animate={on ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7 }}
        className="card p-6"
      >
        <p className="eyebrow">Lock 1 · the trustee reasons</p>
        <p className="mt-4 text-sm text-muted">Ada asks for $300: “Uniforms and books for the new school year.”</p>
        <p className="mt-4 border-l-2 border-gold pl-3 font-serif text-lg italic">
          “Books, uniforms and exam fees: up to $300 per school year, with a receipt.”
        </p>
        <ul className="mt-4 grid gap-1 text-sm text-ink-2">
          <li>The receipt matches the school&apos;s list.</li>
          <li>Nothing has been spent on books this year.</li>
        </ul>
        <p className="mt-5 flex items-center justify-between rounded-xl bg-paper-2 px-4 py-3">
          <span className="text-sm text-muted">Trustee says</span>
          <span className="font-serif text-2xl">Pay $300</span>
        </p>
      </motion.div>

      <div className="flex items-center justify-center py-2 lg:flex-col lg:px-2">
        <motion.div
          initial={reduce ? false : { scaleX: 0 }}
          animate={on ? { scaleX: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="h-px w-16 origin-left bg-seal lg:hidden"
        />
        <span className="mx-3 rounded-full border border-rule bg-card px-3 py-1 text-center text-xs text-muted lg:my-3 lg:mx-0 lg:max-w-[7rem]">
          can only get stricter
        </span>
        <motion.div
          initial={reduce ? false : { scaleY: 0 }}
          animate={on ? { scaleY: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="hidden h-16 w-px origin-top bg-seal lg:block"
        />
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, x: 20 }}
        animate={on ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="card p-6"
      >
        <p className="eyebrow">Lock 2 · fixed rules, in code</p>
        <ul className="mt-4 grid gap-2.5">
          {RULES.map(([rule, note], i) => {
            const lowered = note.includes("lowered");
            return (
              <motion.li
                key={rule}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={on ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.8 + i * 0.22 }}
                className="flex items-center gap-3 text-sm"
              >
                <motion.span
                  initial={reduce ? false : { scale: 0 }}
                  animate={on ? { scale: 1 } : {}}
                  transition={{ delay: 0.95 + i * 0.22, type: "spring", stiffness: 500, damping: 20 }}
                  className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] text-paper ${lowered ? "bg-amber" : "bg-leaf"}`}
                >
                  {lowered ? "↓" : "✓"}
                </motion.span>
                <span className="flex-1">{rule}</span>
                <span className={`font-mono text-xs ${lowered ? "text-amber" : "text-muted"}`}>{note}</span>
              </motion.li>
            );
          })}
        </ul>
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={on ? { opacity: 1 } : {}}
          transition={{ delay: 2.4 }}
          className="mt-5 flex items-center justify-between rounded-xl bg-leaf-soft px-4 py-3 text-leaf"
        >
          <span className="text-sm">Sent to Ada</span>
          <span className="font-serif text-2xl">$250</span>
        </motion.p>
      </motion.div>
    </div>
  );
}
