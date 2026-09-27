"use client";

import { useEffect, useState } from "react";

type Link = { label: string; note: string; href: string };

// The settlor's list of private links. Each one only works for that person;
// anyone else on the trust's plain address can only read it.
export default function ShareLinks({ links }: { links: Link[] }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  async function copy(label: string, url: string) {
    try {
      if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) await navigator.share({ title: label, url });
      else await navigator.clipboard.writeText(url);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      // Share sheet closed; nothing to do.
    }
  }

  return (
    <div className="card p-5">
      <h3 className="font-medium">Private links</h3>
      <p className="mt-1 text-sm text-muted">One per person. Keep yours safe.</p>
      <ul className="mt-3 grid gap-2">
        {links.map((l) => {
          const url = `${origin}${l.href}`;
          return (
            <li key={l.label} className="flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-2 text-sm">
              <span>
                <span className="font-medium">{l.label}</span> <span className="text-muted">· {l.note}</span>
              </span>
              <span className="flex gap-2">
                <a className="btn-ghost text-xs" href={l.href}>
                  Open
                </a>
                <button className="btn-ghost text-xs" type="button" onClick={() => copy(l.label, url)}>
                  {copied === l.label ? "Copied" : "Share"}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
