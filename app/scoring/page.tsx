import type { Metadata } from "next";
import Link from "next/link";
import { LivePrizeMoneySection } from "@/components/LivePrizeMoneySection";
import {
  QUICK_RULE_CALLOUTS,
  MASTERS_SCORING_COPY,
  SCORING_PAGE_INTRO,
  SCORING_ROWS,
  SUNDAY_BONUS_EXPANDED,
  SUNDAY_BONUS_RULES,
  SUNDAY_SCORING_COPY,
  WORKED_EXAMPLE,
} from "@/lib/contestContent";

export const metadata: Metadata = {
  title: "Scoring",
  description: "Masters scoring, Sunday bonus scoring, and worked examples.",
};

function formatPoints(points: number) {
  if (points > 0) return `+${points}`;
  return `${points}`;
}

function ScoringList({
  title,
  copy,
  rows,
  accent = false,
}: {
  title: string;
  copy: string;
  rows: { result: string; points: number }[];
  accent?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border p-6 shadow-sm ${
        accent
          ? "border-masters-gold/60 bg-gradient-to-br from-white to-amber-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <h2 className="text-2xl font-serif font-bold text-masters-green">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700">{copy}</p>

      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div
            key={row.result}
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-masters-cream/50 px-4 py-3"
          >
            <span className="text-sm font-medium text-gray-800">{row.result}</span>
            <span className="rounded-full bg-masters-green px-3 py-1 text-sm font-bold text-white">
              {formatPoints(row.points)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ScoringPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
      <section className="rounded-3xl border border-masters-green/10 bg-white p-6 shadow-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-masters-gold">
          Scoring Guide
        </p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-serif font-bold text-masters-green">Scoring</h1>
            <p className="mt-4 text-sm leading-6 text-gray-700 md:text-base">{SCORING_PAGE_INTRO}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/rules"
              className="rounded-full border border-masters-green/20 px-5 py-2.5 text-sm font-semibold text-masters-green transition-colors hover:bg-masters-green hover:text-white"
            >
              Read Rules
            </Link>
            <Link
              href="/play"
              className="rounded-full bg-masters-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800"
            >
              Build Lineup
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {QUICK_RULE_CALLOUTS.map((callout) => (
            <div key={callout.label} className="rounded-2xl border border-gray-200 bg-masters-cream/60 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {callout.label}
              </p>
              <p className="mt-1 text-lg font-bold text-masters-green">{callout.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6">
        <ScoringList
          title="Masters Scoring Table"
          copy={MASTERS_SCORING_COPY}
          rows={SCORING_ROWS}
          accent
        />

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-masters-green/10 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-masters-gold">
              Sunday Bonus Scoring
            </p>
            <h2 className="mt-3 text-2xl font-serif font-bold text-masters-green">
              Sunday bonus affects overall only
            </h2>
            <p className="mt-4 text-sm leading-6 text-gray-700">{SUNDAY_SCORING_COPY}</p>
            <p className="mt-4 text-sm leading-6 text-gray-700">{SUNDAY_BONUS_EXPANDED}</p>

            <div className="mt-6 rounded-2xl bg-masters-green/5 p-5">
              <p className="text-sm font-semibold text-masters-green">Plain-English summary</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
                {SUNDAY_BONUS_RULES.map((rule) => (
                  <li key={rule} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-masters-gold" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <ScoringList
            title="Sunday Bonus Scoring"
            copy="The same hole values are used for the Sunday team bonus. Every entry assigned to that team gets the same hole-by-hole bonus points."
            rows={SCORING_ROWS}
          />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-serif font-bold text-masters-green">Worked Example</h2>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-masters-cream/50 p-5">
              <h3 className="text-lg font-bold text-gray-900">{WORKED_EXAMPLE.masters.title}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-700">{WORKED_EXAMPLE.masters.copy}</p>
              <div className="mt-4 space-y-2">
                {WORKED_EXAMPLE.masters.rows.map((row) => (
                  <div
                    key={row.result}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2"
                  >
                    <span className="text-sm text-gray-700">{row.result}</span>
                    <span className="text-sm font-semibold text-masters-green">
                      {formatPoints(row.points)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-masters-green px-4 py-3 text-white">
                <span className="text-sm font-semibold">4-hole total</span>
                <span className="text-lg font-bold">{formatPoints(WORKED_EXAMPLE.masters.total)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-masters-gold/50 bg-gradient-to-br from-white to-amber-50 p-5">
              <h3 className="text-lg font-bold text-gray-900">{WORKED_EXAMPLE.sunday.title}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-700">{WORKED_EXAMPLE.sunday.copy}</p>
              <div className="mt-5 rounded-2xl bg-white px-4 py-4 shadow-sm">
                <p className="text-sm font-semibold text-masters-green">Quick math</p>
                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Birdie on one hole</span>
                    <span className="font-semibold text-masters-green">+3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Par on the next</span>
                    <span className="font-semibold text-masters-green">+0.5</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <span className="font-semibold text-gray-900">Sunday bonus added to overall</span>
                    <span className="text-lg font-bold text-masters-green">+3.5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="rounded-2xl border border-masters-green/10 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-masters-gold">
              Prize Money
            </p>
            <h2 className="mt-3 text-2xl font-serif font-bold text-masters-green">
              Live money leaderboard
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700">
              This board shows what has already been won, what the current day is worth right now,
              and what each entry is sitting on in the overall race if the standings held.
            </p>
          </div>

          <LivePrizeMoneySection />
        </section>
      </div>
    </div>
  );
}
