// How every request is handled, in one line. Shown above the decisions.
const STEPS = ["Asked", "AI decides 3 times", "Code checks quote and limits", "Paid, or held for a person"];

export default function DecisionPath() {
  return (
    <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className="grid size-4 place-items-center rounded-full border border-rule font-mono text-[9px]">{i + 1}</span>
          {s}
          {i < STEPS.length - 1 && <span aria-hidden>→</span>}
        </li>
      ))}
    </ol>
  );
}
