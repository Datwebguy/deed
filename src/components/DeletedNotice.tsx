"use client";

import { useEffect, useState } from "react";

// A short confirmation after a settlor deletes their trust.
export default function DeletedNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("deleted") !== "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);
    window.history.replaceState(null, "", "/");
    const t = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div role="status" className="card fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-5 py-3 text-sm">
      Trust deleted.
    </div>
  );
}
