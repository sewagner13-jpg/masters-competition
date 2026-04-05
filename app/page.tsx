import Link from "next/link";
import { APP_NAME, SALARY_CAP, ROSTER_SIZE } from "@/lib/constants";

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      {/* Badge */}
      <div className="inline-block bg-masters-gold text-masters-green text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-6">
        2026 Masters Tournament
      </div>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-serif font-bold text-masters-green mb-4 leading-tight">
        {APP_NAME}
      </h1>

      <p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto">
        Pick{" "}
        <span className="font-bold text-masters-green">{ROSTER_SIZE} golfers</span>{" "}
        from the Masters field. Stay under the{" "}
        <span className="font-bold text-masters-green">
          ${SALARY_CAP.toLocaleString()}
        </span>{" "}
        salary cap. Climb the leaderboard as the tournament plays out.
      </p>

      {/* CTA */}
      <Link
        href="/play"
        className="inline-block bg-masters-green text-white font-bold text-lg px-10 py-4 rounded-lg shadow hover:bg-green-800 transition-colors"
      >
        Build Your Lineup →
      </Link>

      <div className="mt-6">
        <Link
          href="/leaderboard"
          className="text-masters-green font-medium underline underline-offset-2 hover:text-green-700"
        >
          View Leaderboard
        </Link>
      </div>

      {/* How it works */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        {[
          {
            step: "1",
            title: "Enter Your Name",
            desc: "No account needed. Just type your name and start picking.",
          },
          {
            step: "2",
            title: "Pick 6 Golfers",
            desc: `Select ${ROSTER_SIZE} players from the field. Stay under $${SALARY_CAP.toLocaleString()} total salary.`,
          },
          {
            step: "3",
            title: "Watch the Leaderboard",
            desc: "Scores update automatically as the tournament progresses.",
          },
        ].map(({ step, title, desc }) => (
          <div
            key={step}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
          >
            <div className="text-3xl font-serif font-bold text-masters-gold mb-2">
              {step}
            </div>
            <h3 className="font-bold text-masters-green mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
