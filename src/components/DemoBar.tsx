import Link from "next/link";

type View = { label: string; href: string; active: boolean };

// On demo trusts, switch between the three people's views in one tap.
export default function DemoBar({ views }: { views: View[] }) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-2 rounded-2xl border border-gold/50 bg-amber-soft/40 px-4 py-3 text-sm">
      <span className="font-medium">Demo</span>
      <span className="text-muted">· test money · view as</span>
      {views.map((v) => (
        <Link
          key={v.label}
          href={v.href}
          className={`rounded-full px-3 py-1 transition ${v.active ? "bg-ink text-paper" : "border border-rule bg-card hover:border-ink"}`}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}
