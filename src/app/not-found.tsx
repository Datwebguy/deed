import Link from "next/link";
import Seal from "@/components/ui/Seal";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-xl place-items-center px-4 py-32 text-center">
      <Seal className="text-6xl opacity-80" />
      <h1 className="mt-6 font-serif text-4xl">Nothing sealed here.</h1>
      <p className="mt-3 text-muted">
        This link doesn&apos;t match a trust. If it came from a private link, check it was copied in full.
      </p>
      <Link href="/" className="btn mt-8">
        Back to Deed
      </Link>
    </div>
  );
}
