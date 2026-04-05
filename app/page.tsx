import Link from "next/link";
import { APP_NAME, SALARY_CAP, ROSTER_SIZE } from "@/lib/constants";
import {
  ENTRY_DEADLINE_SHORT,
  HOME_SUMMARY_CARDS,
  QUICK_RULE_CALLOUTS,
} from "@/lib/contestContent";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
      <section className="overflow-hidden rounded-3xl border border-masters-green/10 bg-white shadow-sm">
        <div className="grid gap-8 px-6 py-10 md:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-block rounded-full bg-masters-gold px-3 py-1 text-xs font-bold uppercase tracking-widest text-masters-green">
              2026 Masters Tournament
            </div>

            <h1 className="mt-6 text-4xl font-serif font-bold leading-tight text-masters-green md:text-5xl">
              {APP_NAME}
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Pick{" "}
              <span className="font-bold text-masters-green">{ROSTER_SIZE} golfers</span>{" "}
              from the Masters field. Stay under the{" "}
              <span className="font-bold text-masters-green">
                ${SALARY_CAP.toLocaleString()}
              </span>{" "}
              salary cap, chase the daily prizes, and try to win the full weekend.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/play"
                className="inline-flex items-center rounded-full bg-masters-green px-6 py-3 text-sm font-bold text-white shadow transition-colors hover:bg-green-800"
              >
                Build Your Lineup
              </Link>
              <Link
                href="/rules"
                className="inline-flex items-center rounded-full border border-masters-green/20 px-6 py-3 text-sm font-semibold text-masters-green transition-colors hover:bg-masters-green hover:text-white"
              >
                Read Rules
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex items-center rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-masters-gold hover:text-masters-green"
              >
                View Leaderboard
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-masters-green to-green-900 p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-masters-gold">
              Quick Look
            </p>
            <div className="mt-5 space-y-3">
              {QUICK_RULE_CALLOUTS.map((callout) => (
                <div
                  key={callout.label}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                    {callout.label}
                  </p>
                  <p className="mt-1 text-xl font-bold">{callout.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-white/80">
              One entry per person. Lineups lock at {ENTRY_DEADLINE_SHORT}. Daily prizes are round-by-round, and the Sunday bonus settles the overall race.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {HOME_SUMMARY_CARDS.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1 hover:border-masters-gold"
          >
            <div className="inline-flex rounded-full bg-masters-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-masters-green">
              Quick Start
            </div>
            <h2 className="mt-4 text-2xl font-serif font-bold text-masters-green">
              {card.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{card.description}</p>
            <p className="mt-5 text-sm font-semibold text-masters-green transition-colors group-hover:text-green-700">
              Open page →
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-masters-gold/50 bg-gradient-to-r from-amber-50 to-white px-6 py-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-masters-green">
          New here?
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-700">
          Start with the rules, then check the scoring page if you want the full breakdown of daily scoring, Sunday bonus scoring, and how prizes are decided.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/rules" className="text-masters-green hover:text-green-700">
            Rules
          </Link>
          <Link href="/scoring" className="text-masters-green hover:text-green-700">
            Scoring
          </Link>
        </div>
      </div>
    </div>
  );
}
