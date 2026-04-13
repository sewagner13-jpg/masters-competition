"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LastUpdatedBanner } from "@/components/LastUpdatedBanner";
import { LeaderboardChat } from "@/components/LeaderboardChat";
import { AwardedMoneyTable } from "@/components/AwardedMoneyTable";
import { FinalPayoutTable } from "@/components/FinalPayoutTable";
import { PrizeMoneyTable } from "@/components/PrizeMoneyTable";
import { getAwardedMoneySummary, getDailyPayoutMap, getFinalPayoutSummary, getPrizeMoneySummary } from "@/lib/payouts";
import Link from "next/link";
import type { EntryScoreResult, PlayerScoreResult } from "@/lib/scoring/engine";

type ViewTab = "today" | "overall" | "projected";

interface LeaderboardResponse {
  leaderboard: EntryScoreResult[];
  isLocked: boolean;
  activeRound: 1 | 2 | 3 | 4 | null;
  contestEndedAt: string | null;
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

function usd(amount: number) {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function rankBadge(rank: number) {
  const base = "inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm shrink-0";
  if (rank === 1) return <span className={`${base} bg-masters-gold text-masters-green`}>1</span>;
  if (rank === 2) return <span className={`${base} bg-gray-300 text-gray-700`}>2</span>;
  if (rank === 3) return <span className={`${base} bg-amber-600 text-white`}>3</span>;
  return <span className={`${base} bg-gray-100 text-gray-500`}>{rank}</span>;
}

function formatTeeTime(teeTime: string | null): string | null {
  if (!teeTime) return null;

  try {
    const date = new Date(teeTime);
    return date.toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
}

function formatContestEndedAt(endedAt: string | null): string | null {
  if (!endedAt) return null;

  return new Date(endedAt).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatPlayerStatus(player: PlayerScoreResult): string {
  const teeTimeLabel = formatTeeTime(player.teeTime);

  if (player.isFinished) {
    return player.position ? `${player.position} · F` : "F";
  }

  if (!player.isOnCourse && teeTimeLabel) {
    return `Tees ${teeTimeLabel} ET`;
  }

  if (!player.position && !player.thru) return "—";
  let result = player.position ?? "—";
  if (player.thru === "F") result += " · F";
  else if (player.thru) result += ` · thru ${player.thru}`;
  return result;
}

function playerRoundPts(player: PlayerScoreResult, round: number | null): number {
  if (round === 1) return player.r1Pts;
  if (round === 2) return player.r2Pts;
  if (round === 3) return player.r3Pts;
  if (round === 4) return player.r4Pts;
  return 0;
}

function entryDisplayScore(entry: EntryScoreResult, tab: ViewTab, todayRound: number | null) {
  if (tab === "today" && todayRound) {
    return entry[ROUND_SCORE_KEY[todayRound] as keyof EntryScoreResult] as number;
  }

  return entry.scoreOverall;
}

function TopLeadersCard({
  entries,
  tab,
  todayRound,
}: {
  entries: EntryScoreResult[];
  tab: ViewTab;
  todayRound: number | null;
}) {
  const leaders = entries.slice(0, 5);
  const dailyPayoutMap = tab === "today" ? getDailyPayoutMap(entries, todayRound as 1 | 2 | 3 | 4 | null) : new Map<string, number>();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-lg font-bold text-masters-green">Top 5 Right Now</h2>
        <p className="text-xs text-gray-500">
          Quick snapshot so the leaders stay visible while chat is open.
          {tab === "today" && " Today payouts update live with the daily standings."}
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {leaders.map((entry, idx) => {
          const dailyPayout = dailyPayoutMap.get(entry.entryId) ?? 0;
          const showSundayTeam = tab !== "today" && (entry.sundayTeamName || entry.sundayBonusPoints !== 0);

          return (
          <div key={entry.entryId} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              {rankBadge(idx + 1)}
              <span className="truncate text-sm font-semibold text-gray-900">{entry.userName}</span>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-mono text-sm font-bold text-masters-green">
                {fmt(entryDisplayScore(entry, tab, todayRound))}
              </div>
              {tab === "today" && (
                <div className={`text-[11px] font-semibold ${dailyPayout > 0 ? "text-amber-700" : "text-gray-400"}`}>
                  {dailyPayout > 0 ? `Today ${usd(dailyPayout)}` : "Today —"}
                </div>
              )}
              {showSundayTeam && (
                <div className="max-w-[12rem] truncate text-[11px] font-semibold text-gray-500">
                  {entry.sundayTeamName ? `Sun team: ${entry.sundayTeamName}` : "Sun team"}
                  {` · ${fmt(entry.sundayBonusPoints)}`}
                </div>
              )}
            </div>
          </div>
        )})}
      </div>
    </section>
  );
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
  const onCoursePlayers = hasLineup
    ? entry.players.filter((player) => player.isOnCourse)
    : [];
  const finishedPlayers = hasLineup
    ? entry.players.filter((player) => player.isFinished)
    : [];
  const showSundayTeamSummary = Boolean(entry.sundayTeamName) || entry.sundayBonusPoints !== 0;

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
          <div className="min-w-0">
            {nameEl}
            {hasLineup && (
              <p className="mt-0.5 text-xs leading-5 text-gray-500">
                <span className="font-semibold text-masters-green">
                  On course ({onCoursePlayers.length})
                </span>
                {onCoursePlayers.length > 0 && (
                  <span>: {onCoursePlayers.map((player) => player.playerName).join(", ")}</span>
                )}
                <span className="mx-1.5 text-gray-300">•</span>
                <span className="font-semibold text-gray-600">
                  Finished ({finishedPlayers.length})
                </span>
              </p>
            )}
            {showSundayTeamSummary && (
              <p className="text-xs leading-5 text-gray-500">
                <span className="font-semibold text-masters-green">Sunday team:</span>{" "}
                {entry.sundayTeamName ?? "Unassigned"}
                <span className="mx-1.5 text-gray-300">•</span>
                <span className="font-semibold text-gray-600">Bonus in overall:</span>{" "}
                {fmt(entry.sundayBonusPoints)}
              </p>
            )}
          </div>
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
              const status = formatPlayerStatus(player);
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

          {showSundayTeamSummary && (
            <div className="mt-2 rounded-lg border border-masters-green/15 bg-masters-green/5 px-3 py-2">
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-masters-green">Sunday team:</span>{" "}
                {entry.sundayTeamName ?? "Unassigned"}
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                <span className="font-semibold text-masters-green">Sunday team bonus:</span>{" "}
                {fmt(entry.sundayBonusPoints)}{" "}
                <span className="text-gray-400">added to overall</span>
              </p>
            </div>
          )}

          {/* Sunday + message (if present) */}
          {(entry.sundayRepName || entry.publicMessage) && (
            <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
              {entry.sundayRepName && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-600">Sunday rep:</span> {entry.sundayRepName}
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
    const requestUrl = `/api/leaderboard?ts=${Date.now()}`;

    fetch(requestUrl, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: LeaderboardResponse) => {
        if ("error" in d) throw new Error((d as { error: string }).error);
        setData(d);
        setError(null);
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
  const prizeMoneySummary = data
    ? getPrizeMoneySummary(data.leaderboard, todayRound)
    : null;
  const awardedMoneySummary = data
    ? getAwardedMoneySummary(data.leaderboard, todayRound)
    : null;
  const finalPayoutSummary = data?.contestEndedAt
    ? getFinalPayoutSummary(data.leaderboard)
    : null;
  const contestEndedLabel = formatContestEndedAt(data?.contestEndedAt ?? null);

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

      {data?.contestEndedAt && (
        <div className="mb-4 bg-masters-green/10 border border-masters-green/30 rounded-lg px-4 py-3 text-sm text-masters-green text-center">
          🏁 Contest finalized{contestEndedLabel ? ` ${contestEndedLabel}` : ""} · Final payouts below are official.
        </div>
      )}

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

      {data && sortedEntries.length > 0 && (
        <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.85fr)]">
          <LeaderboardChat />
          <TopLeadersCard entries={sortedEntries} tab={tab} todayRound={todayRound} />
        </div>
      )}

      {finalPayoutSummary && (
        <FinalPayoutTable
          rows={finalPayoutSummary.rows}
          completedRounds={finalPayoutSummary.completedRounds}
          finalizedAt={data?.contestEndedAt ?? null}
        />
      )}

      {prizeMoneySummary && (
        <div className="mb-5">
          <PrizeMoneyTable
            rows={prizeMoneySummary.rows}
            liveTodayRound={prizeMoneySummary.liveTodayRound}
            title="Live Money Race"
            subtitle="This board includes completed daily payouts, the current day, and the current overall payout spots if the tournament ended right now."
            limit={5}
            compact
          />
        </div>
      )}

      {awardedMoneySummary && (
        <div className="mb-5">
          <AwardedMoneyTable
            rows={awardedMoneySummary.rows}
            completedRounds={awardedMoneySummary.completedRounds}
            title="Money Already Won"
            subtitle="Only completed daily payouts count here. The current round does not show up until that day is finished and paid out."
            limit={5}
            compact
          />
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
