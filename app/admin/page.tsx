"use client";

import { useState, useEffect, useCallback } from "react";

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

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  const [entries, setEntries] = useState<EntryAdmin[]>([]);
  const [sundayTeams, setSundayTeams] = useState<SundayTeam[]>([]);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [lockState, setLockState] = useState<LockState | null>(null);
  const [loading, setLoading] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const [editingEntry, setEditingEntry] = useState<EntryAdmin | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [holeScores, setHoleScores] = useState<Record<number, string>>({});
  const [teamMsg, setTeamMsg] = useState<string | null>(null);

  const hdrs = (extra?: Record<string, string>) => ({
    "x-admin-secret": secret,
    "Content-Type": "application/json",
    ...extra,
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, runsRes, teamsRes] = await Promise.all([
        fetch("/api/admin/settings", { headers: hdrs() }),
        fetch("/api/admin/sync-runs", { headers: hdrs() }),
        fetch("/api/admin/sunday-team", { headers: hdrs() }),
      ]);
      if (settingsRes.status === 401) { setAuthed(false); setAuthError("Session expired."); return; }
      const settingsData = await settingsRes.json();
      const runsData = await runsRes.json();
      const teamsData = await teamsRes.json();
      setEntries(settingsData.entries ?? []);
      setLockState(settingsData.lockState ?? null);
      setSyncRuns(runsData.runs ?? []);
      setSundayTeams(teamsData.teams ?? []);
    } finally { setLoading(false); }
  }, [secret]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAuth() {
    setAuthError("");
    const res = await fetch("/api/admin/settings", { headers: { "x-admin-secret": secret } });
    if (res.status === 401) { setAuthError("Incorrect admin secret."); return; }
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

  async function handleSaveTeam() {
    setTeamMsg(null);
    const parsed: { hole: number; scoreToPar: number }[] = [];
    for (let h = 1; h <= 18; h++) {
      const v = holeScores[h];
      if (v !== undefined && v !== "") parsed.push({ hole: h, scoreToPar: Number(v) });
    }
    const res = await fetch("/api/admin/sunday-team", {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({ teamName: newTeamName.trim(), holeScores: parsed }),
    });
    const d = await res.json();
    if (res.ok) { setTeamMsg(`Saved "${d.team.teamName}" — ${d.team.bonusPoints.toFixed(1)} pts`); loadAll(); }
    else setTeamMsg(`Error: ${d.error}`);
  }

  // Post-lock roster edit (commissioner)
  async function handleCommissionerRosterEdit(entryId: string, newPlayerIds: string[]) {
    const res = await fetch(`/api/entries/${entryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "1110", playerIds: newPlayerIds }),
    });
    const d = await res.json();
    if (!res.ok) alert(`Error: ${d.error}`);
    else { setEditingEntry(null); loadAll(); }
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-4 py-20">
        <h1 className="text-xl font-serif font-bold text-masters-green mb-6 text-center">Admin Panel</h1>
        <input type="password" placeholder="Admin secret" value={secret} onChange={(e) => setSecret(e.target.value)}
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
        <p className="text-xs text-gray-500 mb-4">Assign a Sunday representative and team to each entry for admin tracking and Sunday bonus scoring.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b text-xs">
              <th className="pb-2 pr-3 font-semibold">Entry</th>
              <th className="pb-2 pr-3 font-semibold">Representative</th>
              <th className="pb-2 pr-3 font-semibold">Team</th>
              <th className="pb-2 font-semibold">Playing?</th>
            </tr></thead>
            <tbody>
              {entries.map((entry) => (
                <SundayRow key={entry.id} entry={entry} onSave={saveEntrySettings} />
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-gray-400 text-sm">No entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Sunday Team Scores ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-1">Sunday Team Scores</h2>
        <p className="text-xs text-gray-500 mb-4">
          Enter hole-by-hole scores for each Sunday team. Score to par: -1 = birdie, 0 = par, 1 = bogey, 2 = double bogey, 3+ = worse than double bogey.
          Points are computed automatically using the fantasy scoring table.
        </p>

        {/* Existing teams */}
        {sundayTeams.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {sundayTeams.map((t) => (
              <span key={t.id} className="bg-green-50 border border-green-200 text-xs px-3 py-1 rounded-full text-green-800">
                {t.teamName}: <strong>{t.bonusPoints.toFixed(1)} pts</strong>
              </span>
            ))}
          </div>
        )}

        {/* Add / update team */}
        <div className="border border-gray-200 rounded-lg p-4">
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
                  type="number" min={-3}
                  value={holeScores[hole] ?? ""}
                  onChange={(e) => setHoleScores((p) => ({ ...p, [hole]: e.target.value }))}
                  className="w-full border border-gray-300 rounded text-center text-sm py-1 focus:outline-none focus:ring-1 focus:ring-masters-green"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          <button onClick={handleSaveTeam} disabled={!newTeamName.trim()}
            className="bg-masters-green text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-green-800 disabled:opacity-40">
            Save Team Scores
          </button>
          {teamMsg && <p className="mt-2 text-sm text-gray-700">{teamMsg}</p>}
        </div>
      </section>

      {/* ── All Entries (scores) ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">All Entries ({entries.length})</h2>
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
                <th className="pb-2 text-right font-bold">Overall</th>
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
                    <td className="py-2 text-right font-mono font-bold text-masters-green">{fmt(e.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 mt-6 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-1">Protected Lineups</h2>
        <p className="text-xs text-gray-500 mb-4">Visible only after entering the admin secret.</p>
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
                    <span className="text-xs font-mono text-gray-500">
                      ${entry.players.reduce((sum, ep) => sum + ep.player.salary, 0).toLocaleString()}
                    </span>
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
          onClose={() => setEditingEntry(null)}
          onSave={handleCommissionerRosterEdit}
        />
      )}
    </div>
  );
}

// ─── Sunday Row (inline editable) ────────────────────────────────────────────

function SundayRow({
  entry,
  onSave,
}: {
  entry: EntryAdmin;
  onSave: (id: string, fields: Partial<EntryAdmin>) => Promise<void>;
}) {
  const [rep, setRep] = useState(entry.sundayRepName ?? "");
  const [team, setTeam] = useState(entry.sundayTeamName ?? "");
  const [playing, setPlaying] = useState(entry.isPlayingSunday);
  const [saving, setSaving] = useState(false);

  const isDirty =
    rep !== (entry.sundayRepName ?? "") ||
    team !== (entry.sundayTeamName ?? "") ||
    playing !== entry.isPlayingSunday;

  async function save() {
    setSaving(true);
    await onSave(entry.id, { sundayRepName: rep || null, sundayTeamName: team || null, isPlayingSunday: playing } as Partial<EntryAdmin>);
    setSaving(false);
  }

  return (
    <tr className="border-b border-gray-50">
      <td className="py-2 pr-3 font-medium text-gray-900 whitespace-nowrap">{entry.userName}</td>
      <td className="py-2 pr-3">
        <input type="text" value={rep} onChange={(e) => setRep(e.target.value)}
          placeholder="Name"
          className="border border-gray-200 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-masters-green" />
      </td>
      <td className="py-2 pr-3">
        <input type="text" value={team} onChange={(e) => setTeam(e.target.value)}
          placeholder="Team name"
          className="border border-gray-200 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-masters-green" />
      </td>
      <td className="py-2">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={playing} onChange={(e) => setPlaying(e.target.checked)}
            className="accent-masters-green" />
          {isDirty && (
            <button onClick={save} disabled={saving}
              className="text-xs bg-masters-green text-white px-2 py-0.5 rounded hover:bg-green-800 disabled:opacity-50">
              {saving ? "..." : "Save"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Commissioner Roster Edit Modal ──────────────────────────────────────────

function CommissionerEditModal({
  entry,
  onClose,
  onSave,
}: {
  entry: EntryAdmin;
  onClose: () => void;
  onSave: (entryId: string, playerIds: string[]) => Promise<void>;
}) {
  const [note] = useState("Roster edit functionality is available via the Edit page using the commissioner code (1110).");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-masters-green mb-3">Edit Roster: {entry.userName}</h2>
        <p className="text-sm text-gray-600 mb-4">{note}</p>
        <a
          href={`/edit/${entry.id}`}
          className="block w-full bg-masters-green text-white text-center font-bold py-2 rounded-lg hover:bg-green-800"
        >
          Open Edit Page →
        </a>
        <button onClick={onClose} className="mt-2 w-full text-sm text-gray-500 underline">Cancel</button>
      </div>
    </div>
  );
}
