"use client";

import { EntryScoreResult } from "@/lib/scoring/engine";

interface Props {
  leaderboard: EntryScoreResult[];
}

function formatScore(score: number): string {
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : `${score}`;
}

function rankBadge(rank: number) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-masters-gold text-masters-green font-bold text-sm">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-300 text-gray-700 font-bold text-sm">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-600 text-white font-bold text-sm">
        3
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-500 font-semibold text-sm">
      {rank}
    </span>
  );
}

export function LeaderboardTable({ leaderboard }: Props) {
  if (leaderboard.length === 0) {
    return (
      <div className="text-center text-gray-400 py-16">
        <p className="text-4xl mb-3">⛳</p>
        <p className="font-medium">No lineups submitted yet.</p>
        <p className="text-sm mt-1">Be the first to build your lineup!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {leaderboard.map((entry, idx) => (
        <div
          key={entry.entryId}
          className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
            idx === 0 ? "border-masters-gold" : "border-gray-200"
          }`}
        >
          {/* Entry header */}
          <div
            className={`flex items-center justify-between px-4 py-3 ${
              idx === 0 ? "bg-masters-gold/10" : "bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3">
              {rankBadge(idx + 1)}
              <span className="font-bold text-gray-900">{entry.userName}</span>
            </div>
            <span
              className={`text-lg font-bold font-mono ${
                entry.totalScore < 0
                  ? "text-red-600"
                  : entry.totalScore === 0
                  ? "text-gray-700"
                  : "text-gray-400"
              }`}
            >
              {formatScore(entry.totalScore)}
            </span>
          </div>

          {/* Player breakdown */}
          <div className="px-4 py-2 grid grid-cols-2 md:grid-cols-3 gap-2">
            {entry.players.map((p) => (
              <div
                key={p.playerId}
                className="flex justify-between items-center text-xs text-gray-600 py-1 border-b border-gray-50 last:border-0"
              >
                <span className="font-medium truncate mr-2">{p.playerName}</span>
                <span className="font-mono shrink-0">
                  {p.totalToPar !== null ? formatScore(p.totalToPar) : "--"}
                  {p.thru ? ` (${p.thru})` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
