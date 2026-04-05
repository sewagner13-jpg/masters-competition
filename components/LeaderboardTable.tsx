"use client";

/**
 * LeaderboardTable — kept for potential reuse.
 * The main leaderboard page renders inline; this component is available
 * for simpler embed contexts.
 */

import type { EntryScoreResult } from "@/lib/scoring/engine";

interface Props {
  leaderboard: EntryScoreResult[];
}

function fmt(pts: number): string {
  if (pts === 0) return "0";
  return pts > 0 ? `+${pts.toFixed(1)}` : pts.toFixed(1);
}

function rankBadge(rank: number) {
  const base = "inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm";
  if (rank === 1) return <span className={`${base} bg-masters-gold text-masters-green`}>1</span>;
  if (rank === 2) return <span className={`${base} bg-gray-300 text-gray-700`}>2</span>;
  if (rank === 3) return <span className={`${base} bg-amber-600 text-white`}>3</span>;
  return <span className={`${base} bg-gray-100 text-gray-500`}>{rank}</span>;
}

export function LeaderboardTable({ leaderboard }: Props) {
  if (leaderboard.length === 0) {
    return (
      <div className="text-center text-gray-400 py-16">
        <p className="text-4xl mb-3">⛳</p>
        <p className="font-medium">No lineups submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {leaderboard.map((entry, idx) => (
        <div key={entry.entryId} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${idx === 0 ? "border-masters-gold" : "border-gray-200"}`}>
          <div className={`flex items-center justify-between px-4 py-3 ${idx === 0 ? "bg-masters-gold/10" : "bg-gray-50"}`}>
            <div className="flex items-center gap-3">
              {rankBadge(idx + 1)}
              <span className="font-bold text-gray-900">{entry.userName}</span>
            </div>
            <span className="text-lg font-bold font-mono text-masters-green">{fmt(entry.scoreOverall)}</span>
          </div>
          {entry.players.length > 0 && (
            <div className="px-4 py-2 grid grid-cols-2 md:grid-cols-3 gap-1">
              {entry.players.map((p) => (
                <div key={p.playerId} className="flex justify-between text-xs text-gray-600">
                  <span className="font-medium truncate mr-2">{p.playerName}</span>
                  <span className="font-mono shrink-0">{p.position ?? "--"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
