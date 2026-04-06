"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LastUpdatedBanner } from "@/components/LastUpdatedBanner";
import Link from "next/link";
import type { EntryScoreResult } from "@/lib/scoring/engine";

type ViewTab = "today" | "overall" | "projected";

interface LeaderboardResponse {
  leaderboard: EntryScoreResult[];
  isLocked: boolean;
  activeRound: 1 | 2 | 3 | 4 | null;
  lastSyncedAt: string | null;
}

const ROUND_LABELS: Record<number, string> = { 1: "Thursday", 2: "Friday", 3: "Saturday", 4: "Sunday" };
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

// ─── Entry Detail Modal (post-lock) ──────────────────────────────────────────

function EntryDetailModal({ entry, onClose }: { entry: EntryScoreResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold text-masters-green">{entry.userName}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-600">×</button>
        </div>

        {/* Golfers */}
        {entry.players.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Lineup</h3>
            <div className="space-y-1">
              {entry.players.map((player) => (
                <div key={player.playerId} className="flex justify-between text-sm">
                  <span className="font-medium">{player.playerName}</span>
                  <span className="font-mono text-xs text-gray-500">
                    {player.position ?? "--"}{player.thru ? ` (thru ${player.thru})` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sunday info */}
        {(entry.sundayRepName || entry.sundayTeamName) && (
          <div className="border-t pt-3 mb-3">
            <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Sunday</h3>
            {entry.sundayRepName && (
              <p className="text-sm"><span className="text-gray-500">Rep: </span><span className="font-medium">{entry.sundayRepName}</span></p>
            )}
            {entry.sundayTeamName && (
              <p className="text-sm mt-0.5"><span className="text-gray-500">Team: </span><span className="font-medium">{entry.sundayTeamName}</span></p>
            )}
          </div>
        )}

        {/* Public message */}
        {entry.publicMessage && (
          <div className="border-t pt-3 mb-3">
            <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">Message</h3>
            <p className="text-sm italic text-gray-700">&ldquo;{entry.publicMessage}&rdquo;</p>
          </div>
        )}

        {/* Score breakdown */}
        <div className="border-t pt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Scores</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {[1, 2, 3, 4].map((round) => {
              const key = ROUND_SCORE_KEY[round] as keyof typeof entry;
              const pts = entry[key] as number;
              return (
                <div key={round} className="flex justify-between">
                  <span className="text-gray-500">{ROUND_LABELS[round]}</span>
                  <span className="font-mono font-semibold">{fmt(pts)}</span>
                </div>
              );
            })}
            {entry.sundayBonusPoints !== 0 && (
              <div className="col-span-2 flex justify-between">
                <span className="text-gray-500">Sunday Bonus</span>
                <span className="font-mono font-semibold">{fmt(entry.sundayBonusPoints)}</span>
              </div>
            )}
            <div className="col-span-2 flex justify-between border-t pt-1 font-bold">
              <span>Overall</span>
              <span className="font-mono">{fmt(entry.scoreOverall)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Entry row ───────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  rank,
  tab,
  todayRound,
  isLocked,
  onClick,
}: {
  entry: EntryScoreResult;
  rank: number;
  tab: ViewTab;
  todayRound: number | null;
  isLocked: boolean;
  onClick: () => void;
}) {
  const roundScore =
    todayRound ? (entry[ROUND_SCORE_KEY[todayRound] as keyof typeof entry] as number) : 0;

  const isGold = rank === 1;

  const scoreDisplay =
    tab === "today" && todayRound ? (
      <div>
        <span className="text-base font-bold font-mono text-masters-green">{fmt(roundScore)}</span>
        <span className="text-xs text-gray-400 ml-2">({fmt(entry.scoreOverall)} overall)</span>
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
      className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
        isLocked ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      } ${isGold ? "border-masters-gold" : "border-gray-200"}`}
      onClick={isLocked ? onClick : undefined}
    >
      <div className={`flex items-center justify-between px-4 py-3 ${isGold ? "bg-masters-gold/10" : "bg-gray-50"}`}>
        <div className="flex items-center gap-3">
          {rankBadge(rank)}
          {nameEl}
        </div>
        <div className="text-right">{scoreDisplay}</div>
      </div>
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
  const [selectedEntry, setSelectedEntry] = useState<EntryScoreResult | null>(null);

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
  const todayLabel = todayRound ? ROUND_LABELS[todayRound] : null;

  // Sort for the active tab
  const sortedEntries = data
    ? [...data.leaderboard].sort((a, b) => {
        if (tab === "today" && todayRound) {
          const key = ROUND_SCORE_KEY[todayRound] as keyof EntryScoreResult;
          return (b[key] as number) - (a[key] as number);
        }
        return b.scoreOverall - a.scoreOverall; // overall + projected both sort by overall
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
          🔒 Contest is locked · Lineups are final · Tap any entry to see its full lineup
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
              onClick={() => setSelectedEntry(entry)}
            />
          ))}
          <p className="mt-2 text-center text-xs text-gray-400">
            {data.isLocked
              ? "Tap an entry to see the full lineup."
              : "Click your name to edit your lineup before the deadline."}
          </p>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/play" className="inline-block bg-masters-green text-white font-bold px-6 py-3 rounded-lg hover:bg-green-800 transition-colors">
          Build Your Lineup
        </Link>
      </div>

      {/* Post-lock detail modal */}
      {data?.isLocked && selectedEntry && (
        <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return <Suspense><LeaderboardContent /></Suspense>;
}
