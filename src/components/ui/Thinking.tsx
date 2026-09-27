"use client";

import { useEffect, useState } from "react";

// A calm, staged "working" indicator for the slow reasoning calls.
export default function Thinking({ steps, every = 2600 }: { steps: string[]; every?: number }) {
  const [at, setAt] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setAt((a) => Math.min(a + 1, steps.length - 1)), 2600);
    return () => clearInterval(t);
  }, [steps.length, every]);
  return (
    <div className="card mt-8 p-6">
      <ul className="grid gap-3">
        {steps.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 transition-opacity ${i <= at ? "opacity-100" : "opacity-30"}`}>
            <span
              className={`grid size-5 place-items-center rounded-full border text-[10px] ${
                i < at ? "border-leaf bg-leaf text-paper" : i === at ? "border-ink" : "border-rule"
              }`}
            >
              {i < at ? "✓" : i === at ? <span className="size-2 animate-ping rounded-full bg-ink" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ul>
      <div className="shimmer mt-5 h-3 w-2/3" />
      <div className="shimmer mt-2 h-3 w-1/2" />
    </div>
  );
}
