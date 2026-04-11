"use client";

import { useCallback, useEffect, useState } from "react";
import { AwardedMoneyTable } from "@/components/AwardedMoneyTable";
import { LastUpdatedBanner } from "@/components/LastUpdatedBanner";
import { PrizeMoneyTable } from "@/components/PrizeMoneyTable";
import {
  getAwardedMoneySummary,
  getPrizeMoneySummary,
  type PrizeMoneyEntry,
} from "@/lib/payouts";

interface LeaderboardResponse {
  leaderboard: PrizeMoneyEntry[];
  activeRound: 1 | 2 | 3 | 4 | null;
  lastSyncedAt: string | null;
}

export function LivePrizeMoneySection() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/leaderboard", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || "error" in payload) {
        throw new Error(payload.error ?? "Failed to load prize money.");
      }
      setData(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prize money.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
        Prize money leaderboard is unavailable right now: {error}
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5 text-sm text-gray-500 shadow-sm">
        Loading prize money leaderboard...
      </section>
    );
  }

  const summary = getPrizeMoneySummary(data.leaderboard, data.activeRound);
  const awardedSummary = getAwardedMoneySummary(data.leaderboard, data.activeRound);

  return (
    <div className="space-y-4">
      <AwardedMoneyTable
        rows={awardedSummary.rows}
        completedRounds={awardedSummary.completedRounds}
        title="Money Already Won"
        subtitle="This board only counts completed daily payouts. The current day stays out until that round is finished and paid."
      />
      <PrizeMoneyTable
        rows={summary.rows}
        liveTodayRound={summary.liveTodayRound}
        title="Live Prize Money Leaderboard"
        subtitle="Won = completed daily payouts. Live total adds the current day and the current overall payout spots if the standings held right now."
      />
      <LastUpdatedBanner lastSyncedAt={data.lastSyncedAt} />
    </div>
  );
}
