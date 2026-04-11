import type { AwardedMoneyRow } from "@/lib/payouts";

function usd(amount: number) {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const ROUND_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Thu",
  2: "Fri",
  3: "Sat",
  4: "Sun",
};

export function AwardedMoneyTable({
  rows,
  completedRounds,
  title,
  subtitle,
  limit,
  compact = false,
}: {
  rows: AwardedMoneyRow[];
  completedRounds: Array<1 | 2 | 3 | 4>;
  title: string;
  subtitle: string;
  limit?: number;
  compact?: boolean;
}) {
  const visibleRows = limit ? rows.slice(0, limit) : rows;
  const roundsLabel =
    completedRounds.length > 0
      ? `Paid rounds: ${completedRounds.map((round) => ROUND_LABELS[round]).join(", ")}`
      : "No completed daily payouts yet";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-lg font-bold text-masters-green">{title}</h2>
        <p className="text-xs leading-5 text-gray-500">{subtitle}</p>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-5 text-sm text-gray-500">
          Money already won will show here once a round finishes and payouts are awarded.
        </div>
      ) : compact ? (
        <div className="divide-y divide-gray-100">
          {visibleRows.map((row, index) => (
            <div key={row.entryId} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {index + 1}. {row.userName}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-gray-500">{roundsLabel}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Won</p>
                <p className="font-mono text-sm font-bold text-masters-green">{usd(row.wonSoFar)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto px-4 py-3">
          <div className="mb-3 text-xs font-medium text-gray-500">{roundsLabel}</div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-3 font-semibold">#</th>
                <th className="py-2 pr-4 font-semibold">Entry</th>
                <th className="py-2 text-right font-semibold">Already Won</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row.entryId} className="border-b border-gray-50">
                  <td className="py-2 pr-3 text-xs font-semibold text-gray-400">{index + 1}</td>
                  <td className="py-2 pr-4 font-medium text-gray-900">{row.userName}</td>
                  <td className="py-2 text-right font-mono font-bold text-masters-green">
                    {usd(row.wonSoFar)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
