"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { LastUpdatedBanner } from "@/components/LastUpdatedBanner";
import Link from "next/link";
import type { EntryScoreResult } from "@/lib/scoring/engine";
import { Suspense } from "react";

interface LeaderboardResponse {
  leaderboard: EntryScoreResult[];
  lastSyncedAt: string | null;
}

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const submitted = searchParams.get("submitted") === "1";
  const submittedName = searchParams.get("name") ?? "";

  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d: LeaderboardResponse) => {
        if ("error" in d) throw new Error((d as { error: string }).error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLeaderboard();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchLeaderboard, 60_000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Success banner */}
      {submitted && submittedName && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-center">
          <p className="font-bold text-masters-green text-lg">
            Lineup submitted, {submittedName}! 🎉
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Your entry is locked in. Check back as tournament scores update.
          </p>
          <Link
            href="/play"
            className="inline-block mt-3 text-sm text-masters-green underline underline-offset-2"
          >
            Submit another lineup
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-serif font-bold text-masters-green">
          Leaderboard
        </h1>
        <button
          onClick={fetchLeaderboard}
          className="text-xs text-masters-green underline underline-offset-2 hover:text-green-700"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4">
        {data && <LastUpdatedBanner lastSyncedAt={data.lastSyncedAt} />}
      </div>

      {loading && (
        <div className="text-center text-masters-green animate-pulse py-12">
          Loading leaderboard...
        </div>
      )}

      {error && (
        <div className="text-center text-red-600 py-12">
          <p className="font-medium">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="mt-2 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}

      {data && !loading && (
        <LeaderboardTable leaderboard={data.leaderboard} />
      )}

      <div className="mt-8 text-center">
        <Link
          href="/play"
          className="inline-block bg-masters-green text-white font-bold px-6 py-3 rounded-lg hover:bg-green-800 transition-colors"
        >
          Build Your Lineup
        </Link>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense>
      <LeaderboardContent />
    </Suspense>
  );
}
