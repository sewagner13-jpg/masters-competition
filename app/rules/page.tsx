import type { Metadata } from "next";
import Link from "next/link";
import {
  QUICK_RULE_CALLOUTS,
  RULES_INTRO,
  RULES_SECTIONS,
  SUNDAY_BONUS_EXPANDED,
  SUNDAY_BONUS_RULES,
  SUNDAY_BONUS_SHORT,
} from "@/lib/contestContent";

export const metadata: Metadata = {
  title: "Rules",
  description: "Contest rules, prizes, Sunday bonus, and tie rules in plain English.",
};

function SectionCard({
  title,
  copy,
  bullets,
  accent = false,
}: {
  title: string;
  copy?: string;
  bullets?: string[];
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
      <h2 className="text-xl font-serif font-bold text-masters-green">{title}</h2>
      {copy && <p className="mt-3 text-sm leading-6 text-gray-700">{copy}</p>}
      {bullets && (
        <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-masters-gold" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function RulesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
      <section className="overflow-hidden rounded-3xl border border-masters-green/10 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-masters-green to-green-800 px-6 py-10 text-white md:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-masters-gold">
            Contest Guide
          </p>
          <h1 className="mt-3 text-4xl font-serif font-bold">Rules</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
            {RULES_INTRO}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/play"
              className="rounded-full bg-masters-gold px-5 py-2.5 text-sm font-semibold text-masters-green transition-colors hover:bg-amber-300"
            >
              Build Lineup
            </Link>
            <Link
              href="/scoring"
              className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              See Scoring
            </Link>
          </div>
        </div>

        <div className="grid gap-4 bg-masters-cream/60 px-6 py-5 md:grid-cols-3 md:px-10">
          {QUICK_RULE_CALLOUTS.map((callout) => (
            <div
              key={callout.label}
              className="rounded-2xl border border-white/70 bg-white/90 px-4 py-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {callout.label}
              </p>
              <p className="mt-1 text-lg font-bold text-masters-green">{callout.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {RULES_SECTIONS.slice(0, 5).map((section) => (
          <SectionCard
            key={section.title}
            title={section.title}
            copy={section.copy}
            bullets={section.bullets}
          />
        ))}

        <section className="rounded-2xl border border-masters-gold/60 bg-gradient-to-br from-masters-green to-green-900 p-6 text-white shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-masters-gold">
                Sunday Bonus
              </p>
              <h2 className="mt-3 text-2xl font-serif font-bold">The extra twist in the game</h2>
              <p className="mt-4 text-sm leading-6 text-white/85">{SUNDAY_BONUS_SHORT}</p>
              <p className="mt-4 text-sm leading-6 text-white/75">{SUNDAY_BONUS_EXPANDED}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5 lg:max-w-md">
              <p className="text-sm font-semibold text-masters-gold">What to remember</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-white/85">
                {SUNDAY_BONUS_RULES.map((rule) => (
                  <li key={rule} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-masters-gold" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {RULES_SECTIONS.slice(5).map((section) => (
          <SectionCard
            key={section.title}
            title={section.title}
            copy={section.copy}
            bullets={section.bullets}
            accent={section.title === "Prizes"}
          />
        ))}
      </div>
    </div>
  );
}
