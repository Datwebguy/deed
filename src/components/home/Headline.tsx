"use client";

import { motion, useReducedMotion } from "motion/react";

// The hero line, set word by word. Words wrapped in *stars* are set in italic seal red.
export default function Headline({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <h1 className={className}>
      {text.split(" ").map((w, i) => {
        const em = w.startsWith("*");
        return (
          <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
            <motion.span
              className={`inline-block ${em ? "italic text-seal" : ""}`}
              initial={reduce ? false : { y: "110%", rotate: 4 }}
              animate={{ y: 0, rotate: 0 }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              {em ? w.replaceAll("*", "") : w}&nbsp;
            </motion.span>
          </span>
        );
      })}
    </h1>
  );
}
