import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/constants";
import Link from "next/link";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Pick your 6-player Masters lineup and compete with friends.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="bg-masters-green text-white shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link
              href="/"
              className="text-lg font-serif font-bold tracking-wide hover:text-masters-gold transition-colors"
            >
              ⛳ {APP_NAME}
            </Link>
            <nav className="flex gap-4 text-sm font-medium">
              <Link
                href="/play"
                className="hover:text-masters-gold transition-colors"
              >
                Build Lineup
              </Link>
              <Link
                href="/leaderboard"
                className="hover:text-masters-gold transition-colors"
              >
                Leaderboard
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-masters-green text-white/60 text-center text-xs py-3 mt-8">
          {APP_NAME} &mdash; {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
