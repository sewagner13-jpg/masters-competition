"use client";

import { useState, useEffect, useCallback } from "react";

interface SyncRun {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  message: string | null;
  recordsUpdated: number;
}

interface EntryPlayer {
  player: { name: string; salary: number };
}

interface Entry {
  id: string;
  userName: string;
  submittedAt: string;
  totalSalary: number;
  score: number;
  status: string;
  players: EntryPlayer[];
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    success: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    skipped: "bg-yellow-100 text-yellow-800",
    running: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const headers = { "x-admin-secret": secret };

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [runsRes, entriesRes] = await Promise.all([
        fetch("/api/admin/sync-runs", { headers }),
        fetch("/api/admin/entries", { headers }),
      ]);

      if (runsRes.status === 401 || entriesRes.status === 401) {
        setAuthed(false);
        setAuthError("Session expired or invalid secret.");
        return;
      }

      const runsData = await runsRes.json();
      const entriesData = await entriesRes.json();

      setSyncRuns(runsData.runs ?? []);
      setEntries(entriesData.entries ?? []);
    } finally {
      setLoadingData(false);
    }
  }, [secret]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAuth() {
    setAuthError("");
    const res = await fetch("/api/admin/sync-runs", {
      headers: { "x-admin-secret": secret },
    });
    if (res.status === 401) {
      setAuthError("Incorrect admin secret.");
      return;
    }
    setAuthed(true);
  }

  useEffect(() => {
    if (authed) loadData();
  }, [authed, loadData]);

  async function handleManualSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers,
      });
      const data = await res.json();
      setSyncMsg(`${data.status}: ${data.message}`);
      loadData();
    } catch {
      setSyncMsg("Sync request failed.");
    } finally {
      setSyncing(false);
    }
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-4 py-20">
        <h1 className="text-xl font-serif font-bold text-masters-green mb-6 text-center">
          Admin Access
        </h1>
        <input
          type="password"
          placeholder="Admin secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green"
        />
        {authError && (
          <p className="text-red-600 text-sm mb-3">{authError}</p>
        )}
        <button
          onClick={handleAuth}
          className="w-full bg-masters-green text-white font-bold py-2 rounded-lg hover:bg-green-800"
        >
          Enter
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold text-masters-green">
          Admin Panel
        </h1>
        <button
          onClick={loadData}
          disabled={loadingData}
          className="text-sm text-masters-green underline hover:text-green-700"
        >
          {loadingData ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Manual sync */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">Manual Stat Sync</h2>
        <p className="text-sm text-gray-500 mb-4">
          Forces a stat sync regardless of the active time window. Use this
          to test your stats provider or trigger an unscheduled refresh.
        </p>
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="bg-masters-green text-white font-bold px-5 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Run Sync Now"}
        </button>
        {syncMsg && (
          <p className="mt-3 text-sm font-mono text-gray-700">{syncMsg}</p>
        )}
      </section>

      {/* Recent sync runs */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">
          Recent Sync Runs ({syncRuns.length})
        </h2>
        {syncRuns.length === 0 ? (
          <p className="text-sm text-gray-400">No sync runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Started</th>
                  <th className="pb-2 pr-4">Completed</th>
                  <th className="pb-2 pr-4">Records</th>
                  <th className="pb-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {syncRuns.map((run) => (
                  <tr key={run.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4">{statusBadge(run.status)}</td>
                    <td className="py-2 pr-4 text-gray-600">
                      {formatDate(run.startedAt)}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {formatDate(run.completedAt)}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">
                      {run.recordsUpdated}
                    </td>
                    <td className="py-2 text-gray-500 text-xs max-w-xs truncate">
                      {run.message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* All entries */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">
          All Entries ({entries.length})
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">No entries submitted yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="border border-gray-100 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-900">
                    {entry.userName}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(entry.submittedAt)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  Salary: ${entry.totalSalary.toLocaleString()} · Score:{" "}
                  {entry.score} · Status: {entry.status}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                  {entry.players.map((ep, i) => (
                    <div
                      key={i}
                      className="text-xs text-gray-700 flex justify-between"
                    >
                      <span>{ep.player.name}</span>
                      <span className="text-gray-400 font-mono">
                        ${ep.player.salary.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
