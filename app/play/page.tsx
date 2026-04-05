"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Player, PlayerTable } from "@/components/PlayerTable";
import { RosterBuilder } from "@/components/RosterBuilder";
import { SalaryTracker } from "@/components/SalaryTracker";
import { ROSTER_SIZE, SALARY_CAP } from "@/lib/constants";

export default function PlayPage() {
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedMap, setSelectedMap] = useState<Map<string, Player>>(new Map());
  const [userName, setUserName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [publicMessage, setPublicMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    // Check lock state + load players in parallel
    Promise.all([
      fetch("/api/players").then((r) => r.json()),
      fetch("/api/leaderboard").then((r) => r.json()),
    ])
      .then(([playerData, lbData]) => {
        if (playerData.error) throw new Error(playerData.error);
        setPlayers(playerData.players);
        setIsLocked(lbData.isLocked ?? false);
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
      if (next.has(player.id)) next.delete(player.id);
      else next.set(player.id, player);
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
          editCode: editCode.trim() || undefined,
          publicMessage: publicMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(
        `/leaderboard?submitted=1&name=${encodeURIComponent(userName.trim())}`
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-masters-green font-medium animate-pulse">Loading player pool...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600 font-medium">{loadError}</p>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-serif font-bold text-masters-green mb-3">
          Entries Are Closed
        </h1>
        <p className="text-gray-600 mb-6">
          The contest is locked. No new lineups are being accepted.
        </p>
        <a
          href="/leaderboard"
          className="inline-block bg-masters-green text-white font-bold px-6 py-3 rounded-lg hover:bg-green-800"
        >
          View Leaderboard →
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-masters-green">Build Your Lineup</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select {ROSTER_SIZE} players · Stay under ${SALARY_CAP.toLocaleString()} salary cap · One entry per person
        </p>
      </div>

      {/* Entry name */}
      <div className="mb-4 max-w-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Entry Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Your name (e.g. Sean Wagner)"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          maxLength={100}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green"
        />
        <p className="text-xs text-gray-400 mt-1">One entry per person — this becomes your lineup name on the leaderboard.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player pool */}
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

        {/* Sidebar */}
        <div className="lg:sticky lg:top-6 self-start flex flex-col gap-4">
          <SalaryTracker totalSalary={totalSalary} selectedCount={selectedPlayers.length} />

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Your Roster ({selectedPlayers.length}/{ROSTER_SIZE})
            </h2>
            <RosterBuilder selectedPlayers={selectedPlayers} onRemove={removePlayer} />
          </div>

          {/* Optional personal code */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <label className="block text-xs font-semibold text-amber-800 mb-1">
              Personal Edit Code <span className="text-amber-500">(optional but recommended)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. golf2026"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              maxLength={50}
              className="w-full border border-amber-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            />
            <p className="text-xs text-amber-700 mt-1">
              Set a code now so you can edit your lineup before the contest locks. Without one, only the commissioner can make changes.
            </p>
          </div>

          {/* Optional public message */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Public Message <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Shown on leaderboard after lock"
              value={publicMessage}
              onChange={(e) => setPublicMessage(e.target.value)}
              maxLength={200}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green"
            />
          </div>

          {/* Validation hints */}
          <div className="text-xs text-gray-500 space-y-0.5">
            {userName.trim() === "" && <p className="text-amber-600">⚠ Enter your entry name above</p>}
            {selectedPlayers.length < ROSTER_SIZE && (
              <p>⚠ Select {ROSTER_SIZE - selectedPlayers.length} more player{ROSTER_SIZE - selectedPlayers.length !== 1 ? "s" : ""}</p>
            )}
            {totalSalary > SALARY_CAP && (
              <p className="text-red-600">⚠ Over cap by ${(totalSalary - SALARY_CAP).toLocaleString()}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

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
