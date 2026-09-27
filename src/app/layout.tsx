import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"] });
const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Deed",
  description: "Write your wishes in plain words. An AI trustee holds the money and pays out only when your wishes say so.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-rule">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="font-serif text-2xl tracking-tight">
              Deed
            </Link>
            <nav className="flex gap-5 text-sm text-muted">
              <Link href="/#how">How it works</Link>
              <Link href="/start" className="text-ink underline underline-offset-4">
                Start a trust
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-rule">
          <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted">
            Deed is a trust-style account run by an AI trustee, with a human protector who can step in. It is not a
            court-registered trust or legal advice.{" "}
            <a className="underline" href="https://github.com/Datwebguy/deed">
              For developers
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
