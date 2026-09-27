"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// Counts from 0 (or the last value) to `value` when it comes into view.
export default function CountUp({
  value,
  decimals = 0,
  prefix = "",
  duration = 1.4,
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const last = useRef(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      last.current = value;
      return;
    }
    const controls = animate(last.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setShown,
    });
    last.current = value;
    return () => controls.stop();
  }, [inView, value, duration, reduce]);

  const text = (reduce ? value : shown).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {prefix}
      {text}
    </span>
  );
}
