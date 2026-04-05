"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LastUpdatedBanner } from "@/components/LastUpdatedBanner";
import Link from "next/link";
import type { EntryScoreResult } from "@/lib/scoring/engine";

type ViewTab = "today" | "overall";

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

function EntryDetailModal({ entry, onClose }: { entry: EntryScoreResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-bold text-masters-green">{entry.userName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Golfers */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Lineup</h3>
          <div className="space-y-1">
            {entry.players.map((p) => (
              <div key={p.playerId} className="flex justify-between text-sm">
                <span className="font-medium">{p.playerName}</span>
                <span className="text-gray-500 font-mono text-xs">
                  {p.position ?? "--"}{p.thru ? ` (${p.thru})` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sunday details */}
        {(entry.sundayRepName || entry.sundayTeamName) && (
          <div className="border-t pt-3 mb-3">
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Sunday</h3>
            {entry.sundayRepName && (
              <div className="text-sm"><span className="text-gray-500">Representative: </span><span className="font-medium">{entry.sundayRepName}</span></div>
            )}
            {entry.sundayTeamName && (
              <div className="text-sm mt-0.5"><span className="text-gray-500">Team: </span><span className="font-medium">{entry.sundayTeamName}</span></div>
            )}
          </div>
        )}

        {/* Public message */}
        {entry.publicMessage && (
          <div className="border-t pt-3">
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Message</h3>
            <p className="text-sm italic text-gray-700">&ldquo;{entry.publicMessage}&rdquo;</p>
          </div>
        )}

        {/* Score summary */}
        <div className="border-t pt-3 mt-3">
          <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Scores</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {[1,2,3,4].map((r) => {
              const key = ROUND_SCORE_KEY[r] as keyof typeof entry;
              const pts = entry[key] as number;
              return (
                <div key={r} className="flex justify-between">
                  <span className="text-gray-500">{ROUND_LABELS[r]}</span>
                  <span className="font-mono font-semibold">{fmt(pts)}</span>
                </div>
              );
            })}
            {entry.sundayBonusPoints !== 0 && (
              <div className="flex justify-between col-span-2">
                <span className="text-gray-500">Sunday Bonus</span>
                <span className="font-mono font-semibold">{fmt(entry.sundayBonusPoints)}</span>
              </div>
            )}
            <div className="flex justify-between col-span-2 border-t pt-1 font-bold">
              <span>Overall</span>
              <span className="font-mono">{fmt(entry.scoreOverall)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const submitted = searchParams.get("submitted") === "1";
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

  // Sorted leaderboard for the current tab
  const sortedEntries = data
    ? [...data.leaderboard].sort((a, b) => {
        if (tab === "overall") return b.scoreOverall - a.scoreOverall;
        const r = data.activeRound ?? 1;
        const key = ROUND_SCORE_KEY[r] as keyof EntryScoreResult;
        return (b[key] as number) - (a[key] as number);
      })
    : [];
  const preLockEntries = data
    ? [...data.leaderboard].sort((a, b) => a.userName.localeCompare(b.userName))
    : [];

  const todayRound = data?.activeRound ?? null;
  const todayLabel = todayRound ? ROUND_LABELS[todayRound] : "Today";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {submitted && submittedName && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-center">
          <p className="font-bold text-masters-green text-lg">Lineup submitted, {submittedName}! 🎉</p>
          <p className="text-sm text-gray-600 mt-1">Your entry is locked in. Check back as scores update.</p>
          <div className="flex gap-4 justify-center mt-3 text-sm">
            <Link href="/play" className="text-masters-green underline">Submit another lineup</Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-serif font-bold text-masters-green">Leaderboard</h1>
        <button onClick={fetchLeaderboard} className="text-xs text-masters-green underline">Refresh</button>
      </div>

      {data && <div className="mb-4"><LastUpdatedBanner lastSyncedAt={data.lastSyncedAt} /></div>}

      {/* Lock status banner */}
      {data && !data.isLocked && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800 text-center">
          🔓 Contest is open · Lineups are hidden until lock · Entries close <strong>Thu Apr 9 at 7:45 AM ET</strong>
        </div>
      )}
      {data?.isLocked && (
        <div className="mb-4 bg-masters-green/10 border border-masters-green/30 rounded-lg px-4 py-2 text-sm text-masters-green text-center">
          🔒 Contest is locked · All lineups are now visible
        </div>
      )}

      {/* Tab bar */}
      {data?.isLocked && (
        <div className="flex gap-2 mb-5 border-b border-gray-200">
          {[
            { key: "today" as ViewTab, label: todayLabel ? `${todayLabel} (Today)` : "Today's Round" },
            { key: "overall" as ViewTab, label: "Overall" },
          ].map(({ key, label }) => (
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
      )}

      {loading && <div className="text-center text-masters-green animate-pulse py-12">Loading...</div>}
      {error && <div className="text-center text-red-600 py-12">{error}</div>}

      {/* Pre-lock message */}
      {data && !data.isLocked && data.leaderboard.length === 0 && (
        <div className="text-center text-gray-400 py-16">
          <p className="text-4xl mb-3">⛳</p>
          <p className="font-medium">No entries yet. Be the first!</p>
          <Link href="/play" className="mt-3 inline-block text-masters-green underline text-sm">Build your lineup →</Link>
        </div>
      )}

      {data && !data.isLocked && data.leaderboard.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 text-center">
            <p className="text-3xl mb-2">🔐</p>
            <p className="font-semibold text-lg text-gray-800">
              {data.leaderboard.length} {data.leaderboard.length === 1 ? "entry" : "entries"} submitted
            </p>
            <p className="text-sm mt-1 text-gray-500">
              Entry names are visible now. Lineups stay hidden until the contest locks on Thu Apr 9 at 7:45 AM ET.
            </p>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {preLockEntries.map((entry, idx) => (
              <div
                key={entry.entryId}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-masters-green/10 text-sm font-bold text-masters-green">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{entry.userName}</p>
                  <p className="text-xs text-gray-500">Lineup submitted • players hidden until lock</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard table — only shown after lock */}
      {data?.isLocked && sortedEntries.length === 0 && (
        <div className="text-center text-gray-400 py-16">
          <p className="text-4xl mb-3">⛳</p>
          <p className="font-medium">No entries to display.</p>
        </div>
      )}

      {data?.isLocked && sortedEntries.length > 0 && (
        <div className="flex flex-col gap-3">
          {sortedEntries.map((entry, idx) => {
            const roundScore = todayRound
              ? (entry[ROUND_SCORE_KEY[todayRound] as keyof typeof entry] as number)
              : 0;

            return (
              <div
                key={entry.entryId}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${idx === 0 ? "border-masters-gold" : "border-gray-200"}`}
                onClick={() => setSelectedEntry(entry)}
              >
                <div className={`flex items-center justify-between px-4 py-3 ${idx === 0 ? "bg-masters-gold/10" : "bg-gray-50"}`}>
                  <div className="flex items-center gap-3">
                    {rankBadge(idx + 1)}
                    <span className="font-bold text-gray-900">{entry.userName}</span>
                  </div>
                  <div className="text-right">
                    {tab === "today" && todayRound ? (
                      <div>
                        <span className="text-base font-bold font-mono text-masters-green">{fmt(roundScore)}</span>
                        <span className="text-xs text-gray-400 ml-2">({fmt(entry.scoreOverall)} overall)</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold font-mono text-masters-green">{fmt(entry.scoreOverall)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-center text-gray-400 mt-2">Tap an entry to see the full lineup</p>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/play" className="inline-block bg-masters-green text-white font-bold px-6 py-3 rounded-lg hover:bg-green-800 transition-colors">
          Build Your Lineup
        </Link>
      </div>

      {selectedEntry && (
        <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return <Suspense><LeaderboardContent /></Suspense>;
}
