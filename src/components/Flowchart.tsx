"use client";

import { useEffect, useId, useState } from "react";

// Renders the trustee's decision flow. Mermaid is loaded from a CDN on demand
// so it stays out of the main bundle.
export default function Flowchart({ source }: { source: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string>("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import(
          /* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs" as string
        );
        const mermaid = mod.default;
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "neutral", securityLevel: "strict" });
        const out = await mermaid.render(`m${id}`, source);
        if (!cancelled) setSvg(out.svg);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, id]);

  if (failed)
    return <p className="text-sm text-muted">The picture couldn&apos;t be drawn, but the trustee still follows your wishes.</p>;
  if (!svg) return <p className="text-sm text-muted">Drawing…</p>;
  return <div className="overflow-x-auto [&_svg]:mx-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
