"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Player, PlayerTable } from "@/components/PlayerTable";
import { RosterBuilder } from "@/components/RosterBuilder";
import { SalaryTracker } from "@/components/SalaryTracker";
import { ROSTER_SIZE, SALARY_CAP, APP_NAME } from "@/lib/constants";

export default function PlayPage() {
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedMap, setSelectedMap] = useState<Map<string, Player>>(new Map());
  const [userName, setUserName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load players
  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPlayers(data.players);
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedPlayers = Array.from(selectedMap.values());
  const selectedIds = new Set(selectedMap.keys());
  const totalSalary = selectedPlayers.reduce((sum, p) => sum + p.salary, 0);

  const togglePlayer = useCallback((player: Player) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(player.id)) {
        next.delete(player.id);
      } else {
        next.set(player.id, player);
      }
      return next;
    });
  }, []);

  const removePlayer = useCallback((player: Player) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.delete(player.id);
      return next;
    });
  }, []);

  const isValid =
    userName.trim().length > 0 &&
    selectedPlayers.length === ROSTER_SIZE &&
    totalSalary <= SALARY_CAP;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: userName.trim(),
          playerIds: Array.from(selectedMap.keys()),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push(`/leaderboard?submitted=1&name=${encodeURIComponent(userName.trim())}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-masters-green font-medium animate-pulse">
          Loading player pool...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600 font-medium">{loadError}</p>
        <p className="text-sm text-gray-500 mt-2">
          Make sure the database is seeded: <code>npm run db:seed</code>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-masters-green">
          Build Your Lineup
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Select {ROSTER_SIZE} players · Stay under ${SALARY_CAP.toLocaleString()} salary cap
        </p>
      </div>

      {/* Name input */}
      <div className="mb-5 max-w-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Enter your name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          maxLength={100}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player pool — takes 2 cols */}
        <div className="lg:col-span-2">
          <PlayerTable
            players={players}
            selectedIds={selectedIds}
            totalSalary={totalSalary}
            onToggle={togglePlayer}
            search={search}
            onSearchChange={setSearch}
          />
        </div>

        {/* Sidebar — sticky on desktop */}
        <div className="lg:sticky lg:top-6 self-start flex flex-col gap-4">
          <SalaryTracker
            totalSalary={totalSalary}
            selectedCount={selectedPlayers.length}
          />

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Your Roster ({selectedPlayers.length}/{ROSTER_SIZE})
            </h2>
            <RosterBuilder
              selectedPlayers={selectedPlayers}
              onRemove={removePlayer}
            />
          </div>

          {/* Validation messages */}
          <div className="text-xs text-gray-500 space-y-1">
            {userName.trim() === "" && (
              <p className="text-amber-600">⚠ Enter your name above</p>
            )}
            {selectedPlayers.length < ROSTER_SIZE && (
              <p>
                ⚠ Select {ROSTER_SIZE - selectedPlayers.length} more player
                {ROSTER_SIZE - selectedPlayers.length !== 1 ? "s" : ""}
              </p>
            )}
            {totalSalary > SALARY_CAP && (
              <p className="text-red-600">
                ⚠ Over salary cap by $
                {(totalSalary - SALARY_CAP).toLocaleString()}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="w-full bg-masters-green text-white font-bold py-3 rounded-lg shadow hover:bg-green-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Lineup →"}
          </button>
        </div>
      </div>
    </div>
  );
}
