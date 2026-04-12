"use client";

import { useState, useEffect, useCallback } from "react";
import { PlayerTable, type Player } from "@/components/PlayerTable";
import { RosterBuilder } from "@/components/RosterBuilder";
import { SalaryTracker } from "@/components/SalaryTracker";
import { ROSTER_SIZE, SALARY_CAP, BUY_IN } from "@/lib/constants";
import { PAYOUT_STRUCTURE } from "@/lib/payouts";
import { holeScoreToPoints } from "@/lib/scoring/config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EntryAdmin {
  id: string;
  userName: string;
  sundayRepName: string | null;
  sundayTeamName: string | null;
  isPlayingSunday: boolean;
  publicMessage: string | null;
  scoreR1: number;
  scoreR2: number;
  scoreR3: number;
  scoreR4: number;
  sundayBonusPoints: number;
  score: number;
  status: string;
  players: {
    player: {
      id: string;
      name: string;
      salary: number;
    };
  }[];
}

interface SundayTeam {
  id: string;
  teamName: string;
  bonusPoints: number;
  holeScores: {
    hole: number;
    scoreToPar?: number;
    pts?: number;
  }[] | null;
}

interface SyncRun {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  message: string | null;
  recordsUpdated: number;
}

interface LockState {
  isLocked: boolean;
  reason: "deadline" | "manual" | "open";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(pts: number) {
  return pts === 0 ? "0" : pts > 0 ? `+${pts.toFixed(1)}` : pts.toFixed(1);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}

function statusBadge(status: string) {
  const c: Record<string, string> = {
    success: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    skipped: "bg-yellow-100 text-yellow-800",
    running: "bg-blue-100 text-blue-800",
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c[status] ?? "bg-gray-100 text-gray-700"}`}>{status}</span>;
}

function usd(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getHoleScoreState(
  holeScores: SundayTeam["holeScores"] | undefined
): Record<number, string> {
  const next: Record<number, string> = {};

  if (!Array.isArray(holeScores)) return next;

  for (const score of holeScores) {
    const hole = Number(score?.hole);
    const pts = Number(score?.pts);
    const scoreToPar = Number(score?.scoreToPar);

    if (!Number.isInteger(hole) || hole < 1 || hole > 18) continue;

    if (Number.isFinite(pts)) {
      next[hole] = String(pts);
      continue;
    }

    if (Number.isFinite(scoreToPar)) {
      next[hole] = String(holeScoreToPoints(scoreToPar));
    }
  }

  return next;
}

// ─── Payout Calculator ────────────────────────────────────────────────────────

function PayoutCalculator({ entryCount }: { entryCount: number }) {
  const [customCount, setCustomCount] = useState("");
  const n = customCount !== "" ? Math.max(0, parseInt(customCount) || 0) : entryCount;
  const pot = n * BUY_IN;

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        <strong>{n}</strong> entries × ${BUY_IN} buy-in ={" "}
        <strong className="text-masters-green">{usd(pot)}</strong> total pot.
        Ties split the combined prize evenly — no tiebreakers.
      </p>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-xs text-gray-600 font-medium">Override count:</label>
        <input
          type="number" min={0}
          value={customCount}
          onChange={(e) => setCustomCount(e.target.value)}
          placeholder={String(entryCount)}
          className="border border-gray-200 rounded px-2 py-1 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-masters-green"
        />
        {customCount !== "" && (
          <button onClick={() => setCustomCount("")} className="text-xs text-gray-400 underline">Reset</button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="pb-2 pr-3 font-semibold w-24">Bucket</th>
              <th className="pb-2 pr-4 font-semibold">Prize</th>
              <th className="pb-2 pr-4 font-semibold text-right">%</th>
              <th className="pb-2 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {PAYOUT_STRUCTURE.map((row, i) => {
              const prevBucket = i > 0 ? PAYOUT_STRUCTURE[i - 1].bucket : null;
              const showBucket = row.bucket !== prevBucket;
              return (
                <tr key={row.label} className={`border-b border-gray-50 ${showBucket && i > 0 ? "border-t border-gray-200" : ""}`}>
                  <td className="py-1.5 pr-3 text-xs font-semibold text-masters-green align-top">
                    {showBucket ? row.bucket : ""}
                  </td>
                  <td className="py-1.5 pr-4 text-gray-700 text-sm">{row.label}</td>
                  <td className="py-1.5 pr-4 text-right text-gray-500 text-xs">{(row.pct * 100).toFixed(1)}%</td>
                  <td className="py-1.5 text-right font-mono font-semibold text-gray-900 text-sm">
                    {pot > 0 ? usd(pot * row.pct) : "—"}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-gray-300 font-bold text-sm">
              <td colSpan={2} className="pt-2">Total</td>
              <td className="pt-2 text-right text-xs text-gray-500">100%</td>
              <td className="pt-2 text-right font-mono text-masters-green">{pot > 0 ? usd(pot) : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Daily: 4 rounds × 10% of pot (7.5% + 2.5%). Overall: 55% (30%+15%+10%). Last: 5%.
      </p>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const [masterCode, setMasterCode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  const [entries, setEntries] = useState<EntryAdmin[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [sundayTeams, setSundayTeams] = useState<SundayTeam[]>([]);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [lockState, setLockState] = useState<LockState | null>(null);
  const [loading, setLoading] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const [editingEntry, setEditingEntry] = useState<EntryAdmin | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [holeScores, setHoleScores] = useState<Record<number, string>>({});
  const [teamMsg, setTeamMsg] = useState<string | null>(null);

  const hdrs = (extra?: Record<string, string>) => ({
    "x-master-code": masterCode.trim(),
    "Content-Type": "application/json",
    ...extra,
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, runsRes, teamsRes, playersRes] = await Promise.all([
        fetch("/api/admin/settings", { headers: hdrs() }),
        fetch("/api/admin/sync-runs", { headers: hdrs() }),
        fetch("/api/admin/sunday-team", { headers: hdrs() }),
        fetch("/api/players"),
      ]);
      if (settingsRes.status === 401) { setAuthed(false); setAuthError("Session expired."); return; }
      const settingsData = await settingsRes.json();
      const runsData = await runsRes.json();
      const teamsData = await teamsRes.json();
      const playersData = await playersRes.json();
      setEntries(settingsData.entries ?? []);
      setAllPlayers(playersData.players ?? []);
      setLockState(settingsData.lockState ?? null);
      setSyncRuns(runsData.runs ?? []);
      setSundayTeams(teamsData.teams ?? []);
    } finally { setLoading(false); }
  }, [masterCode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAuth() {
    setAuthError("");
    const res = await fetch("/api/admin/settings", { headers: { "x-master-code": masterCode.trim() } });
    if (res.status === 401) { setAuthError("Incorrect master code."); return; }
    setAuthed(true);
  }

  useEffect(() => { if (authed) loadAll(); }, [authed, loadAll]);

  async function handleSync() {
    setSyncing(true); setSyncMsg(null);
    const res = await fetch("/api/admin/sync", { method: "POST", headers: hdrs() });
    const d = await res.json();
    setSyncMsg(`${d.status}: ${d.message}`);
    loadAll();
    setSyncing(false);
  }

  async function handleLockAction(action: string) {
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: hdrs(),
      body: JSON.stringify({ action }),
    });
    loadAll();
  }

  async function saveEntrySettings(entryId: string, fields: Partial<EntryAdmin>) {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({ entryId, ...fields }),
    });
    loadAll();
  }

  function resetTeamEditor() {
    setEditingTeamId(null);
    setNewTeamName("");
    setHoleScores({});
  }

  function loadTeamEditor(team: SundayTeam) {
    setEditingTeamId(team.id);
    setNewTeamName(team.teamName);
    setHoleScores(getHoleScoreState(team.holeScores));
    setTeamMsg(`Editing "${team.teamName}"`);
  }

  async function handleSaveTeam() {
    setTeamMsg(null);
    const parsed: { hole: number; pts: number }[] = [];
    for (let h = 1; h <= 18; h++) {
      const v = holeScores[h];
      if (v !== undefined && v !== "") parsed.push({ hole: h, pts: Number(v) });
    }
    const res = await fetch("/api/admin/sunday-team", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({
        teamId: editingTeamId,
        teamName: newTeamName.trim(),
        holeScores: parsed,
      }),
    });
    const d = await res.json();
    if (res.ok) {
      setEditingTeamId(d.team.id);
      setNewTeamName(d.team.teamName);
      setHoleScores(getHoleScoreState(d.team.holeScores));
      setTeamMsg(`Saved "${d.team.teamName}" — ${d.team.bonusPoints.toFixed(1)} pts`);
      loadAll();
    }
    else setTeamMsg(`Error: ${d.error}`);
  }

  async function handleDeleteTeam(team: SundayTeam) {
    const confirmed = window.confirm(
      `Delete "${team.teamName}"?\n\nThis will clear that Sunday team assignment from any linked entries and remove its bonus from their overall scores.`
    );

    if (!confirmed) return;

    setTeamMsg(null);

    const res = await fetch("/api/admin/sunday-team", {
      method: "DELETE",
      headers: hdrs(),
      body: JSON.stringify({ teamId: team.id }),
    });
    const d = await res.json();

    if (res.ok) {
      if (editingTeamId === team.id) resetTeamEditor();
      setTeamMsg(
        `Deleted "${team.teamName}"${d.clearedAssignments ? ` — cleared ${d.clearedAssignments} linked entr${d.clearedAssignments === 1 ? "y" : "ies"}` : ""}`
      );
      loadAll();
      return;
    }

    setTeamMsg(`Error: ${d.error}`);
  }

  // Post-lock roster edit (admin)
  async function handleCommissionerRosterEdit(entryId: string, newPlayerIds: string[]) {
    const res = await fetch(`/api/entries/${entryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: masterCode.trim(), playerIds: newPlayerIds }),
    });
    const d = await res.json();
    if (!res.ok) return d.error ?? "Failed to save lineup.";
    await loadAll();
    return null;
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-4 py-20">
        <h1 className="text-xl font-serif font-bold text-masters-green mb-6 text-center">Admin Panel</h1>
        <input type="password" placeholder="Master code" value={masterCode} onChange={(e) => setMasterCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green" />
        {authError && <p className="text-red-600 text-sm mb-3">{authError}</p>}
        <button onClick={handleAuth} className="w-full bg-masters-green text-white font-bold py-2 rounded-lg hover:bg-green-800">Enter</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold text-masters-green">Admin Panel</h1>
        <button onClick={loadAll} disabled={loading} className="text-sm text-masters-green underline">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ── Lock Controls ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">Contest Lock</h2>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${lockState?.isLocked ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
            {lockState?.isLocked ? "🔒 Locked" : "🔓 Open"} {lockState?.reason && `(${lockState.reason})`}
          </span>
          <span className="text-xs text-gray-500">Automatic deadline: Thu Apr 9 @ 7:45 AM ET</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handleLockAction("force_lock")}
            className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-red-700">
            Force Lock Now
          </button>
          <button onClick={() => handleLockAction("force_unlock")}
            className="bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-amber-600">
            Force Unlock
          </button>
          <button onClick={() => handleLockAction("clear_override")}
            className="bg-gray-200 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg hover:bg-gray-300">
            Clear Override (use deadline)
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Master code for direct entry edits: <code className="font-mono bg-gray-100 px-1 rounded">use the master code you set</code></p>
      </section>

      {/* ── Payout Calculator ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-1">Payout Calculator</h2>
        <PayoutCalculator entryCount={entries.length} />
      </section>

      {/* ── Stat Sync ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">Manual Stat Sync</h2>
        <button onClick={handleSync} disabled={syncing}
          className="bg-masters-green text-white font-bold px-5 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50">
          {syncing ? "Syncing..." : "Run Sync Now"}
        </button>
        {syncMsg && <p className="mt-2 text-sm font-mono text-gray-700">{syncMsg}</p>}

        {syncRuns.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-1 pr-3">Status</th><th className="pb-1 pr-3">Started</th>
                <th className="pb-1 pr-3">Records</th><th className="pb-1">Message</th>
              </tr></thead>
              <tbody>
                {syncRuns.slice(0, 8).map((r) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-1 pr-3">{statusBadge(r.status)}</td>
                    <td className="py-1 pr-3 text-gray-500">{formatDate(r.startedAt)}</td>
                    <td className="py-1 pr-3 text-gray-700">{r.recordsUpdated}</td>
                    <td className="py-1 text-gray-500 max-w-xs truncate">{r.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Sunday Assignments ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-1">Sunday Assignments</h2>
        <p className="text-xs text-gray-500 mb-4">
          Assign a Sunday rep and team to each entry. Team name dropdown shows existing teams. Click Save per row.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b text-xs">
                <th className="pb-2 pr-3 font-semibold">Entry</th>
                <th className="pb-2 pr-3 font-semibold">Representative</th>
                <th className="pb-2 pr-3 font-semibold">Team</th>
                <th className="pb-2 pr-3 font-semibold text-center">Playing?</th>
                <th className="pb-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <SundayRow
                  key={entry.id}
                  entry={entry}
                  teamOptions={sundayTeams.map((t) => t.teamName)}
                  onSave={saveEntrySettings}
                />
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-gray-400 text-sm">No entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Sunday Team Scores ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-1">Sunday Team Scores</h2>
        <p className="text-xs text-gray-500 mb-4">
          Enter the fantasy points earned on each hole for a Sunday team. Decimals and negative values are allowed, so you can enter values like 0.5, -1, -2, or -5 directly.
        </p>

        {/* Existing teams — click to load into editor */}
        {sundayTeams.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {sundayTeams.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 ${
                  editingTeamId === t.id
                    ? "border-masters-green bg-green-100"
                    : "border-green-200 bg-green-50"
                }`}
              >
                <button
                  onClick={() => loadTeamEditor(t)}
                  className="text-xs text-green-800 hover:text-green-900"
                  title="Click to load and edit"
                >
                  {t.teamName}: <strong>{t.bonusPoints.toFixed(1)} pts</strong>
                </button>
                <button
                  onClick={() => handleDeleteTeam(t)}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                  title="Delete team"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add / update team */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {editingTeamId ? "Editing existing team" : "Create new team"}
              </p>
              {editingTeamId && (
                <p className="mt-1 text-xs text-gray-500">
                  Renaming a team will keep linked entries attached to the new name.
                </p>
              )}
            </div>
            {(editingTeamId || newTeamName || Object.keys(holeScores).length > 0) && (
              <button
                onClick={() => {
                  resetTeamEditor();
                  setTeamMsg(null);
                }}
                className="text-xs text-gray-500 underline"
              >
                Clear editor
              </button>
            )}
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Team Name</label>
            <input type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. Team Wagner"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-masters-green" />
          </div>
          <div className="grid grid-cols-6 md:grid-cols-9 gap-1 mb-3">
            {Array.from({ length: 18 }, (_, i) => i + 1).map((hole) => (
              <div key={hole} className="text-center">
                <div className="text-xs text-gray-400 mb-0.5">{hole}</div>
                <input
                  type="number"
                  min={-5}
                  max={20}
                  step="0.5"
                  value={holeScores[hole] ?? ""}
                  onChange={(e) => setHoleScores((p) => ({ ...p, [hole]: e.target.value }))}
                  className="w-full border border-gray-300 rounded text-center text-sm py-1 focus:outline-none focus:ring-1 focus:ring-masters-green"
                  placeholder="0.5"
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleSaveTeam} disabled={!newTeamName.trim()}
              className="bg-masters-green text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-green-800 disabled:opacity-40">
              {editingTeamId ? "Update Team Scores" : "Save Team Scores"}
            </button>
            {editingTeamId && (
              <button
                onClick={() => {
                  const team = sundayTeams.find((candidate) => candidate.id === editingTeamId);
                  if (team) handleDeleteTeam(team);
                }}
                className="bg-red-50 text-red-700 text-sm font-bold px-4 py-2 rounded-lg hover:bg-red-100 border border-red-200"
              >
                Delete Team
              </button>
            )}
          </div>
          {teamMsg && <p className="mt-2 text-sm text-gray-700">{teamMsg}</p>}
        </div>
      </section>

      {/* ── All Entries (scores) ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">All Entries ({entries.length})</h2>
        <p className="text-xs text-gray-500 mb-4">
          Open lineup edits from here or the protected list below. Locked entries can still be edited inside the admin panel.
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">No entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b text-xs">
                <th className="pb-2 pr-3">Entry</th>
                <th className="pb-2 pr-2 text-right">Thu</th>
                <th className="pb-2 pr-2 text-right">Fri</th>
                <th className="pb-2 pr-2 text-right">Sat</th>
                <th className="pb-2 pr-2 text-right">Sun</th>
                <th className="pb-2 pr-2 text-right">Sun Bonus</th>
                <th className="pb-2 pr-3 text-right font-bold">Overall</th>
                <th className="pb-2"></th>
              </tr></thead>
              <tbody>
                {[...entries].sort((a, b) => b.score - a.score).map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-3 font-medium">{e.userName}</td>
                    <td className="py-2 pr-2 text-right font-mono text-xs">{fmt(e.scoreR1)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-xs">{fmt(e.scoreR2)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-xs">{fmt(e.scoreR3)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-xs">{fmt(e.scoreR4)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-xs">{fmt(e.sundayBonusPoints)}</td>
                    <td className="py-2 pr-3 text-right font-mono font-bold text-masters-green">{fmt(e.score)}</td>
                    <td className="py-2">
                      <button
                        onClick={() => setEditingEntry(e)}
                        className="text-xs text-masters-green underline hover:text-green-800"
                      >
                        Edit lineup →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 mt-6 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-1">Protected Lineups</h2>
        <p className="text-xs text-gray-500 mb-4">Visible only after entering the master code. Edit any lineup here if you need to make a fair commissioner change.</p>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">No entries yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {[...entries]
              .sort((a, b) => a.userName.localeCompare(b.userName))
              .map((entry) => (
                <div key={entry.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-gray-900">{entry.userName}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-gray-500">
                        ${entry.players.reduce((sum, ep) => sum + ep.player.salary, 0).toLocaleString()}
                      </span>
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="rounded-lg bg-masters-green px-3 py-1.5 text-xs font-bold text-white hover:bg-green-800"
                      >
                        Edit lineup
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {entry.players.map((ep) => (
                      <div key={ep.player.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-800">{ep.player.name}</span>
                        <span className="font-mono text-xs text-gray-500">${ep.player.salary.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {editingEntry && (
        <CommissionerEditModal
          entry={editingEntry}
          allPlayers={allPlayers}
          onClose={() => setEditingEntry(null)}
          onSave={handleCommissionerRosterEdit}
        />
      )}
    </div>
  );
}

// ─── Sunday Row (inline editable with team autocomplete) ─────────────────────

function SundayRow({
  entry,
  teamOptions,
  onSave,
}: {
  entry: EntryAdmin;
  teamOptions: string[];
  onSave: (id: string, fields: Partial<EntryAdmin>) => Promise<void>;
}) {
  const [rep, setRep] = useState(entry.sundayRepName ?? "");
  const [team, setTeam] = useState(entry.sundayTeamName ?? "");
  const [playing, setPlaying] = useState(entry.isPlayingSunday);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDirty =
    rep !== (entry.sundayRepName ?? "") ||
    team !== (entry.sundayTeamName ?? "") ||
    playing !== entry.isPlayingSunday;

  async function save() {
    setSaving(true);
    await onSave(entry.id, {
      sundayRepName: rep.trim() || null,
      sundayTeamName: team.trim() || null,
      isPlayingSunday: playing,
    } as Partial<EntryAdmin>);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const listId = `teams-${entry.id}`;

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/40">
      <td className="py-2 pr-3 font-medium text-gray-900 whitespace-nowrap text-sm">{entry.userName}</td>
      <td className="py-2 pr-3">
        <input
          type="text"
          value={rep}
          onChange={(e) => setRep(e.target.value)}
          placeholder="Rep name"
          className="border border-gray-200 rounded px-2 py-1 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-masters-green"
        />
      </td>
      <td className="py-2 pr-3">
        <input
          type="text"
          list={listId}
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          placeholder="Team name"
          className="border border-gray-200 rounded px-2 py-1 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-masters-green"
        />
        <datalist id={listId}>
          {teamOptions.map((t) => <option key={t} value={t} />)}
        </datalist>
      </td>
      <td className="py-2 pr-3 text-center">
        <input
          type="checkbox"
          checked={playing}
          onChange={(e) => setPlaying(e.target.checked)}
          className="accent-masters-green w-4 h-4"
          title="Playing Sunday"
        />
      </td>
      <td className="py-2">
        {saved ? (
          <span className="text-xs text-green-600 font-semibold">✓ Saved</span>
        ) : isDirty ? (
          <button
            onClick={save}
            disabled={saving}
            className="text-xs bg-masters-green text-white px-2.5 py-1 rounded hover:bg-green-800 disabled:opacity-50 font-semibold"
          >
            {saving ? "..." : "Save"}
          </button>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>
    </tr>
  );
}

// ─── Commissioner Roster Edit Modal ──────────────────────────────────────────

function CommissionerEditModal({
  entry,
  allPlayers,
  onClose,
  onSave,
}: {
  entry: EntryAdmin;
  allPlayers: Player[];
  onClose: () => void;
  onSave: (entryId: string, playerIds: string[]) => Promise<string | null>;
}) {
  const [selectedMap, setSelectedMap] = useState<Map<string, Player>>(new Map());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const next = new Map<string, Player>();
    for (const ep of entry.players) {
      next.set(ep.player.id, {
        id: ep.player.id,
        name: ep.player.name,
        salary: ep.player.salary,
        isActive: true,
      });
    }
    setSelectedMap(next);
    setSearch("");
    setSaveError(null);
  }, [entry]);

  const selectedPlayers = Array.from(selectedMap.values());
  const selectedIds = new Set(selectedMap.keys());
  const totalSalary = selectedPlayers.reduce((sum, player) => sum + player.salary, 0);
  const isValid = selectedPlayers.length === ROSTER_SIZE && totalSalary <= SALARY_CAP;

  function togglePlayer(player: Player) {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(player.id)) next.delete(player.id);
      else next.set(player.id, player);
      return next;
    });
  }

  function removePlayer(player: Player) {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.delete(player.id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const error = await onSave(entry.id, Array.from(selectedMap.keys()));
    if (error) {
      setSaveError(error);
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-masters-green">Edit Lineup: {entry.userName}</h2>
            <p className="mt-1 text-sm text-gray-500">Use this only when you need to make a fair admin correction.</p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-600">×</button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PlayerTable
              players={allPlayers}
              selectedIds={selectedIds}
              totalSalary={totalSalary}
              onToggle={togglePlayer}
              search={search}
              onSearchChange={setSearch}
            />
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-4 self-start">
            <SalaryTracker totalSalary={totalSalary} selectedCount={selectedPlayers.length} />

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Roster ({selectedPlayers.length}/{ROSTER_SIZE})
              </h3>
              <RosterBuilder selectedPlayers={selectedPlayers} onRemove={removePlayer} />
            </div>

            {saveError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {saveError}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={!isValid || saving}
              className="w-full rounded-lg bg-masters-green py-3 font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save Admin Changes"}
            </button>
            <button onClick={onClose} className="text-sm text-gray-500 underline">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
