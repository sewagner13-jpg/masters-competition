"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Player, PlayerTable } from "@/components/PlayerTable";
import { LockCountdown } from "@/components/LockCountdown";
import { ROSTER_SIZE, SALARY_CAP } from "@/lib/constants";

// ─── Mini roster card (shown inside sticky panel) ────────────────────────────

function RosterSlot({ player, onRemove }: { player: Player; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 text-sm">
      <span className="font-medium text-gray-900 truncate mr-2">{player.name}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-mono text-gray-500">${player.salary.toLocaleString()}</span>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-base leading-none font-bold">×</button>
      </div>
    </div>
  );
}

function EmptySlot({ num }: { num: number }) {
  return (
    <div className="flex items-center border border-dashed border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-400">
      <span className="w-5 h-5 rounded-full border border-gray-300 text-xs flex items-center justify-center mr-2 shrink-0">{num}</span>
      <span>Empty slot</span>
    </div>
  );
}

// ─── Sticky roster sidebar ────────────────────────────────────────────────────

function RosterPanel({
  selectedPlayers,
  totalSalary,
  onRemove,
}: {
  selectedPlayers: Player[];
  totalSalary: number;
  onRemove: (p: Player) => void;
}) {
  const remaining = SALARY_CAP - totalSalary;
  const overCap = totalSalary > SALARY_CAP;
  const pct = Math.min((totalSalary / SALARY_CAP) * 100, 100);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-masters-green text-sm">
          Your Roster — {selectedPlayers.length}/{ROSTER_SIZE}
        </h2>
        <span className={`text-xs font-semibold ${overCap ? "text-red-600" : "text-gray-500"}`}>
          {overCap
            ? `OVER CAP $${(totalSalary - SALARY_CAP).toLocaleString()}`
            : `$${remaining.toLocaleString()} left`}
        </span>
      </div>

      {/* Salary bar */}
      <div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${overCap ? "bg-red-500" : pct > 90 ? "bg-amber-400" : "bg-masters-green"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>${totalSalary.toLocaleString()} used</span>
          <span>${SALARY_CAP.toLocaleString()} cap</span>
        </div>
      </div>

      {/* Slots */}
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: ROSTER_SIZE }, (_, i) => {
          const p = selectedPlayers[i];
          return p
            ? <RosterSlot key={p.id} player={p} onRemove={() => onRemove(p)} />
            : <EmptySlot key={`empty-${i}`} num={i + 1} />;
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlayPage() {
  const router = useRouter();

  const [players, setPlayers]         = useState<Player[]>([]);
  const [selectedMap, setSelectedMap] = useState<Map<string, Player>>(new Map());
  const [userName, setUserName]       = useState("");
  const [editCode, setEditCode]       = useState("");
  const [publicMessage, setPublicMessage] = useState("");
  const [search, setSearch]           = useState("");
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [isLocked, setIsLocked]       = useState(false);

  useEffect(() => {
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
  const selectedIds     = new Set(selectedMap.keys());
  const totalSalary     = selectedPlayers.reduce((sum, p) => sum + p.salary, 0);

  const togglePlayer = useCallback((player: Player) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(player.id)) next.delete(player.id);
      else next.set(player.id, player);
      return next;
    });
  }, []);

  const removePlayer = useCallback((player: Player) => {
    setSelectedMap((prev) => { const next = new Map(prev); next.delete(player.id); return next; });
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
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      router.push(`/leaderboard?submitted=1&name=${encodeURIComponent(userName.trim())}`);
    } catch { setError("Network error. Please try again."); }
    finally { setSubmitting(false); }
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
        <h1 className="text-2xl font-serif font-bold text-masters-green mb-3">Entries Are Closed</h1>
        <p className="text-gray-600 mb-6">The contest is locked. No new lineups are being accepted.</p>
        <a href="/leaderboard" className="inline-block bg-masters-green text-white font-bold px-6 py-3 rounded-lg hover:bg-green-800">
          View Leaderboard →
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold text-masters-green">Build Your Lineup</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Pick {ROSTER_SIZE} golfers · Stay under ${SALARY_CAP.toLocaleString()} cap · One entry per person
        </p>
      </div>

      {/* Countdown — full width at top */}
      <div className="mb-5">
        <LockCountdown />
      </div>

      {/* Entry name */}
      <div className="mb-5 max-w-sm">
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
        <p className="text-xs text-gray-400 mt-1">One entry per person — this is your lineup name on the leaderboard.</p>
      </div>

      {/* Main grid: player pool + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Player pool — 2 cols on desktop */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <PlayerTable
            players={players}
            selectedIds={selectedIds}
            totalSalary={totalSalary}
            onToggle={togglePlayer}
            search={search}
            onSearchChange={setSearch}
          />
        </div>

        {/* Sidebar — shows first on mobile, sticky on desktop */}
        <div className="lg:sticky lg:top-4 self-start flex flex-col gap-4 order-1 lg:order-2">

          {/* Roster panel */}
          <RosterPanel
            selectedPlayers={selectedPlayers}
            totalSalary={totalSalary}
            onRemove={removePlayer}
          />

          {/* Personal edit code */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <label className="block text-xs font-semibold text-amber-800 mb-1">
              Personal Edit Code
              <span className="ml-1 font-normal text-amber-600">(optional but recommended)</span>
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
              Lets you edit your lineup before the contest locks. Without one, only the commissioner can make changes.
            </p>
          </div>

          {/* Public message */}
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
          <div className="text-xs space-y-0.5 text-gray-500">
            {!userName.trim() && <p className="text-amber-600">⚠ Enter your entry name</p>}
            {selectedPlayers.length < ROSTER_SIZE && (
              <p>⚠ Need {ROSTER_SIZE - selectedPlayers.length} more golfer{ROSTER_SIZE - selectedPlayers.length !== 1 ? "s" : ""}</p>
            )}
            {totalSalary > SALARY_CAP && (
              <p className="text-red-600">⚠ Over cap by ${(totalSalary - SALARY_CAP).toLocaleString()}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="w-full bg-masters-green text-white font-bold py-3 rounded-xl shadow hover:bg-green-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-base"
          >
            {submitting ? "Submitting..." : "Submit Lineup →"}
          </button>

          <p className="text-xs text-gray-400 text-center">$50 buy-in collected separately</p>
        </div>
      </div>
    </div>
  );
}
