"use client";

import { motion, useReducedMotion } from "motion/react";
import Seal from "@/components/ui/Seal";

// Shown once, right after the settlor creates the trust.
export default function SealedBanner({ name }: { name: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mb-8 flex items-center gap-4 overflow-hidden p-5"
    >
      <motion.span
        initial={reduce ? false : { scale: 2.4, rotate: -40, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.2 }}
        className="text-5xl"
      >
        <Seal />
      </motion.span>
      <div>
        <p className="font-serif text-2xl">{name} is sealed.</p>
        <p className="text-sm text-muted">
          Save this page: it&apos;s your private settlor link. Then add money and send each person their link below.
        </p>
      </div>
    </motion.div>
  );
}
