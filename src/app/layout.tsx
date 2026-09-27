import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import Seal from "@/components/ui/Seal";
import WalletChip from "@/components/WalletChip";
import { NETWORK } from "@/lib/wallet";
import "./globals.css";

const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"], axes: ["opsz", "SOFT"], style: ["normal", "italic"] });
const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Deed · Your wishes, kept",
  description: "Write your wishes in plain words. An AI trustee holds the money and pays out only when your wishes say so.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f0e6" },
    { media: "(prefers-color-scheme: dark)", color: "#13120e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 border-b border-rule/70 bg-paper/75 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="group flex items-center gap-2 font-serif text-2xl tracking-tight">
              <Seal className="text-[1.6rem] transition-transform duration-500 group-hover:rotate-[20deg]" />
              Deed
            </Link>
            <nav className="flex items-center gap-1 text-sm sm:gap-2">
              <Link href="/#how" className="hidden rounded-full px-3 py-2 text-muted transition hover:text-ink sm:block">
                How it works
              </Link>
              <Link href="/#locks" className="hidden rounded-full px-3 py-2 text-muted transition hover:text-ink sm:block">
                Safeguards
              </Link>
              <WalletChip network={NETWORK} />
              <span className="ml-1 hidden sm:inline">
                <Link href="/start" className="btn !px-4 !py-2 text-sm">
                  Start a trust
                </Link>
              </span>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-rule/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div className="flex items-center gap-2 font-serif text-lg text-ink">
              <Seal /> Deed
            </div>
            <p className="max-w-xl text-xs leading-relaxed">
              Deed is a trust-style account run by an AI trustee, with a human protector who can step in. It is not a
              court-registered trust or legal advice. Reasoning by SERV · wallets by Coinbase AgentKit · USDC on Base.{" "}
              <a className="underline underline-offset-2 hover:text-ink" href="https://github.com/Datwebguy/deed">
                Source
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
