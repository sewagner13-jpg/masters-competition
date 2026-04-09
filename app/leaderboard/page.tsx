"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LastUpdatedBanner } from "@/components/LastUpdatedBanner";
import Link from "next/link";
import type { EntryScoreResult, PlayerScoreResult } from "@/lib/scoring/engine";

type ViewTab = "today" | "overall" | "projected";

interface LeaderboardResponse {
  leaderboard: EntryScoreResult[];
  isLocked: boolean;
  activeRound: 1 | 2 | 3 | 4 | null;
  lastSyncedAt: string | null;
}

const ROUND_LABELS: Record<number, string> = { 1: "Thu", 2: "Fri", 3: "Sat", 4: "Sun" };
const ROUND_LABELS_LONG: Record<number, string> = { 1: "Thursday", 2: "Friday", 3: "Saturday", 4: "Sunday" };
const ROUND_SCORE_KEY: Record<number, keyof EntryScoreResult> = {
  1: "scoreR1", 2: "scoreR2", 3: "scoreR3", 4: "scoreR4",
};

function fmt(pts: number) {
  if (pts === 0) return "0";
  return pts > 0 ? `+${pts.toFixed(1)}` : pts.toFixed(1);
}

function rankBadge(rank: number) {
  const base = "inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm shrink-0";
  if (rank === 1) return <span className={`${base} bg-masters-gold text-masters-green`}>1</span>;
  if (rank === 2) return <span className={`${base} bg-gray-300 text-gray-700`}>2</span>;
  if (rank === 3) return <span className={`${base} bg-amber-600 text-white`}>3</span>;
  return <span className={`${base} bg-gray-100 text-gray-500`}>{rank}</span>;
}

/**
 * Format a player's status for display.
 * ESPN sometimes returns an ISO datetime string in `position` as the tee time
 * for players who haven't started their round yet. Detect that and convert to
 * a readable Eastern Time string. Otherwise show position + thru as normal.
 */
function formatPlayerStatus(position: string | null, thru: string | null): string {
  // Detect ISO datetime tee time (e.g. "2026-04-09T17:44:00Z")
  if (position && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(position)) {
    try {
      const date = new Date(position);
      const timeET = date.toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `Tees ${timeET} ET`;
    } catch {
      return position;
    }
  }

  // Normal leaderboard position + thru
  if (!position && !thru) return "—";
  let result = position ?? "—";
  if (thru === "F") result += " · F";
  else if (thru) result += ` · thru ${thru}`;
  return result;
}

function playerRoundPts(player: PlayerScoreResult, round: number | null): number {
  if (round === 1) return player.r1Pts;
  if (round === 2) return player.r2Pts;
  if (round === 3) return player.r3Pts;
  if (round === 4) return player.r4Pts;
  return 0;
}

// ─── Entry row (with inline expandable picks) ────────────────────────────────

function EntryRow({
  entry,
  rank,
  tab,
  todayRound,
  isLocked,
}: {
  entry: EntryScoreResult;
  rank: number;
  tab: ViewTab;
  todayRound: number | null;
  isLocked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasLineup = isLocked && entry.players.length > 0;
  const isGold = rank === 1;

  const roundScore = todayRound
    ? (entry[ROUND_SCORE_KEY[todayRound] as keyof typeof entry] as number)
    : 0;

  const scoreDisplay =
    tab === "today" && todayRound ? (
      <div className="text-right">
        <span className="text-base font-bold font-mono text-masters-green">{fmt(roundScore)}</span>
        <span className="text-xs text-gray-400 ml-1.5">({fmt(entry.scoreOverall)})</span>
      </div>
    ) : (
      <span className="text-lg font-bold font-mono text-masters-green">{fmt(entry.scoreOverall)}</span>
    );

  const nameEl = isLocked ? (
    <span className="font-bold text-gray-900">{entry.userName}</span>
  ) : (
    <Link
      href={`/edit/${entry.entryId}`}
      className="font-bold text-gray-900 hover:text-masters-green hover:underline underline-offset-2"
      onClick={(e) => e.stopPropagation()}
    >
      {entry.userName}
    </Link>
  );

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow ${
        hasLineup ? "cursor-pointer hover:shadow-md" : ""
      } ${isGold ? "border-masters-gold" : "border-gray-200"}`}
      onClick={hasLineup ? () => setOpen((o) => !o) : undefined}
    >
      {/* ── Header row ── */}
      <div className={`flex items-center justify-between px-4 py-3 ${isGold ? "bg-masters-gold/10" : "bg-gray-50"}`}>
        <div className="flex items-center gap-3">
          {rankBadge(rank)}
          {nameEl}
        </div>
        <div className="flex items-center gap-2">
          {scoreDisplay}
          {hasLineup && (
            <span className="text-gray-400 text-xs w-3 shrink-0">{open ? "▲" : "▼"}</span>
          )}
        </div>
      </div>

      {/* ── Inline player breakdown ── */}
      {open && hasLineup && (
        <div className="px-4 pt-2 pb-3 bg-white">
          {/* Player rows */}
          <div className="divide-y divide-gray-50">
            {entry.players.map((player) => {
              const status = formatPlayerStatus(player.position, player.thru);
              const isTeeTime = status.startsWith("Tees ");
              const isBlank = status === "—";
              const ptsToShow =
                tab === "today" && todayRound
                  ? playerRoundPts(player, todayRound)
                  : player.r1Pts + player.r2Pts + player.r3Pts + player.r4Pts;

              return (
                <div
                  key={player.playerId}
                  className="grid items-center py-1.5"
                  style={{ gridTemplateColumns: "1fr auto auto" }}
                >
                  <span className="text-sm text-gray-800 font-medium truncate pr-2">
                    {player.playerName}
                  </span>
                  <span
                    className={`text-xs mr-3 whitespace-nowrap ${
                      isTeeTime ? "text-blue-500" : isBlank ? "text-gray-300" : "text-gray-400"
                    }`}
                  >
                    {status}
                  </span>
                  <span className="text-sm font-semibold text-masters-green text-right w-12">
                    {fmt(ptsToShow)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Round totals strip */}
          <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((r) => {
              const pts = entry[ROUND_SCORE_KEY[r] as keyof typeof entry] as number;
              const isToday = r === todayRound;
              return (
                <div key={r} className="text-center">
                  <div className={`text-[10px] uppercase tracking-wide ${isToday ? "text-masters-green font-semibold" : "text-gray-400"}`}>
                    {ROUND_LABELS[r]}
                  </div>
                  <div className={`text-sm font-semibold ${isToday ? "text-masters-green" : "text-gray-600"}`}>
                    {fmt(pts)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sunday + message (if present) */}
          {(entry.sundayRepName || entry.sundayTeamName || entry.publicMessage) && (
            <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
              {entry.sundayRepName && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-600">Sunday rep:</span> {entry.sundayRepName}
                </p>
              )}
              {entry.sundayTeamName && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-600">Sunday team:</span> {entry.sundayTeamName}
                </p>
              )}
              {entry.publicMessage && (
                <p className="text-xs text-gray-500 italic">&ldquo;{entry.publicMessage}&rdquo;</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main leaderboard content ─────────────────────────────────────────────────

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const submitted = searchParams.get("submitted") === "1";
  const updated = searchParams.get("updated") === "1";
  const submittedName = searchParams.get("name") ?? "";

  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ViewTab>("today");

  const fetchLeaderboard = useCallback(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d: LeaderboardResponse) => {
        if ("error" in d) throw new Error((d as { error: string }).error);
        setData(d);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 60_000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const todayRound = data?.activeRound ?? null;
  const todayLabel = todayRound ? ROUND_LABELS_LONG[todayRound] : null;

  const sortedEntries = data
    ? [...data.leaderboard].sort((a, b) => {
        if (tab === "today" && todayRound) {
          const key = ROUND_SCORE_KEY[todayRound] as keyof EntryScoreResult;
          return (b[key] as number) - (a[key] as number);
        }
        return b.scoreOverall - a.scoreOverall;
      })
    : [];

  const tabs: { key: ViewTab; label: string }[] = [
    { key: "today", label: todayLabel ? `${todayLabel} (Today)` : "Today's Round" },
    { key: "overall", label: "Overall" },
    { key: "projected", label: "Projected ⚡" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Success banners */}
      {(submitted || updated) && submittedName && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-center">
          <p className="font-bold text-masters-green text-lg">
            {submitted ? `Lineup submitted, ${submittedName}! 🎉` : `Lineup updated, ${submittedName}! ✅`}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {submitted
              ? "Your entry is locked in. Check back as scores update."
              : "Your changes have been saved."}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-serif font-bold text-masters-green">Leaderboard</h1>
        <button onClick={fetchLeaderboard} className="text-xs text-masters-green underline">Refresh</button>
      </div>

      {data && <div className="mb-4"><LastUpdatedBanner lastSyncedAt={data.lastSyncedAt} /></div>}

      {/* Lock banner */}
      {data && !data.isLocked && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800 text-center">
          🔓 Contest is open — entries close <strong>Thu Apr 9 at 7:45 AM ET</strong> ·{" "}
          <span className="underline cursor-default">Click your name to edit your lineup</span>
        </div>
      )}
      {data?.isLocked && (
        <div className="mb-4 bg-masters-green/10 border border-masters-green/30 rounded-lg px-4 py-2 text-sm text-masters-green text-center">
          🔒 Contest is locked · Tap any entry to expand picks &amp; points
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-0 mb-5 border-b border-gray-200">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              tab === key
                ? "border-masters-green text-masters-green"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Projected tab disclaimer */}
      {tab === "projected" && (
        <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 text-sm text-yellow-800">
          <p className="font-bold">⚡ Unofficial Projected Standings</p>
          <p className="mt-0.5 text-xs">
            Scores update live every 60 seconds and include in-progress rounds. These are{" "}
            <strong>not official</strong> — final standings are determined after each round completes.
          </p>
        </div>
      )}

      {loading && <div className="text-center text-masters-green animate-pulse py-12">Loading...</div>}
      {error && <div className="text-center text-red-600 py-12">{error}</div>}

      {/* Empty state */}
      {data && data.leaderboard.length === 0 && (
        <div className="text-center text-gray-400 py-16">
          <p className="text-4xl mb-3">⛳</p>
          <p className="font-medium">No entries yet. Be the first!</p>
          <Link href="/play" className="mt-3 inline-block text-masters-green underline text-sm">Build your lineup →</Link>
        </div>
      )}

      {/* Entry list */}
      {data && sortedEntries.length > 0 && (
        <div className="flex flex-col gap-3">
          {sortedEntries.map((entry, idx) => (
            <EntryRow
              key={entry.entryId}
              entry={entry}
              rank={idx + 1}
              tab={tab}
              todayRound={todayRound}
              isLocked={data.isLocked}
            />
          ))}
          <p className="mt-2 text-center text-xs text-gray-400">
            {data.isLocked
              ? "Tap any entry to expand picks and scores."
              : "Click your name to edit your lineup before the deadline."}
          </p>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/play" className="inline-block bg-masters-green text-white font-bold px-6 py-3 rounded-lg hover:bg-green-800 transition-colors">
          Build Your Lineup
        </Link>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return <Suspense><LeaderboardContent /></Suspense>;
}
