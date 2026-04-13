import type { FinalPayoutRow } from "@/lib/payouts";

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

function formatFinalizedAt(finalizedAt: string | null) {
  if (!finalizedAt) return null;

  return new Date(finalizedAt).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function FinalPayoutTable({
  rows,
  completedRounds,
  finalizedAt,
}: {
  rows: FinalPayoutRow[];
  completedRounds: Array<1 | 2 | 3 | 4>;
  finalizedAt: string | null;
}) {
  const totalToPay = rows.reduce((sum, row) => sum + row.totalPayout, 0);
  const roundsLabel = completedRounds.length
    ? completedRounds.map((round) => ROUND_LABELS[round]).join(", ")
    : "None yet";
  const finalizedLabel = formatFinalizedAt(finalizedAt);

  return (
    <section className="mb-5 rounded-2xl border border-masters-green/20 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-lg font-bold text-masters-green">Official Final Payouts</h2>
        <p className="text-xs leading-5 text-gray-500">
          Pay from this board once the contest is finalized.
          {finalizedLabel ? ` Finalized ${finalizedLabel}.` : ""}
        </p>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          Daily rounds paid: {roundsLabel}. Total to pay:{" "}
          <span className="font-semibold text-masters-green">{usd(totalToPay)}</span>
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-5 text-sm text-gray-500">
          Final payouts will appear here once the contest is ended in admin.
        </div>
      ) : (
        <div className="overflow-x-auto px-4 py-3">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-3 font-semibold">#</th>
                <th className="py-2 pr-4 font-semibold">Entry</th>
                <th className="py-2 pr-4 text-right font-semibold">Daily Won</th>
                <th className="py-2 pr-4 text-right font-semibold">Overall / Last</th>
                <th className="py-2 text-right font-semibold">Total Owed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.entryId} className="border-b border-gray-50">
                  <td className="py-2 pr-3 text-xs font-semibold text-gray-400">{index + 1}</td>
                  <td className="py-2 pr-4 font-medium text-gray-900">{row.userName}</td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-700">{usd(row.dailyWon)}</td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-700">{usd(row.overallPayout)}</td>
                  <td className="py-2 text-right font-mono font-bold text-masters-green">{usd(row.totalPayout)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
