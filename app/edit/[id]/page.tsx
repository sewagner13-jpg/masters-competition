"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Player, PlayerTable } from "@/components/PlayerTable";
import { RosterBuilder } from "@/components/RosterBuilder";
import { SalaryTracker } from "@/components/SalaryTracker";
import { ROSTER_SIZE, SALARY_CAP } from "@/lib/constants";

interface EntryData {
  id: string;
  userName: string;
  publicMessage: string | null;
  hasEditCode: boolean;
  totalSalary: number;
  players: { id: string; name: string; salary: number }[];
}

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [step, setStep] = useState<"auth" | "edit" | "locked">("auth");
  const [code, setCode] = useState("");
  const [authError, setAuthError] = useState("");

  const [entry, setEntry] = useState<EntryData | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedMap, setSelectedMap] = useState<Map<string, Player>>(new Map());
  const [userName, setUserName] = useState("");
  const [publicMessage, setPublicMessage] = useState("");
  const [search, setSearch] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/entries/${id}`).then((r) => r.json()),
      fetch("/api/players").then((r) => r.json()),
      fetch("/api/leaderboard").then((r) => r.json()),
    ]).then(([entryData, playerData, lbData]) => {
      if (entryData.error) { setStep("locked"); setLoading(false); return; }

      setEntry(entryData.entry);
      setAllPlayers(playerData.players ?? []);
      setIsLocked(lbData.isLocked ?? false);

      if (lbData.isLocked) { setStep("locked"); }

      setLoading(false);
    }).catch(() => { setStep("locked"); setLoading(false); });
  }, [id]);

  const initEdit = useCallback(() => {
    if (!entry) return;
    setUserName(entry.userName);
    setPublicMessage(entry.publicMessage ?? "");
    const map = new Map<string, Player>();
    for (const p of entry.players) {
      map.set(p.id, { id: p.id, name: p.name, salary: p.salary, isActive: true });
    }
    setSelectedMap(map);
  }, [entry]);

  async function handleAuth() {
    setAuthError("");
    if (!code.trim()) { setAuthError("Enter your personal code or the commissioner code."); return; }

    // Quick pre-check: if entry has no edit code set, only master code works
    if (entry && !entry.hasEditCode && code !== "1110") {
      setAuthError("This entry has no personal code. Use the commissioner code if you need to make changes.");
      return;
    }

    // Try a trivial edit to verify the code server-side
    const res = await fetch(`/api/entries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), publicMessage: entry?.publicMessage ?? "" }),
    });

    if (res.status === 403) {
      setAuthError("Incorrect code. Try again or contact the commissioner.");
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      setAuthError(data.error ?? "Something went wrong.");
      return;
    }

    initEdit();
    setStep("edit");
  }

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
      const next = new Map(prev); next.delete(player.id); return next;
    });
  }, []);

  const isValid = userName.trim().length > 0 && selectedPlayers.length === ROSTER_SIZE && totalSalary <= SALARY_CAP;

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/entries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          userName: userName.trim(),
          playerIds: Array.from(selectedMap.keys()),
          publicMessage: publicMessage.trim() || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Save failed."); return; }
      router.push(`/leaderboard?updated=1&name=${encodeURIComponent(userName.trim())}`);
    } catch { setSaveError("Network error. Try again."); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-masters-green animate-pulse">Loading...</div>
      </div>
    );
  }

  if (step === "locked" || isLocked) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-serif font-bold text-masters-green mb-3">Contest Is Locked</h1>
        <p className="text-gray-600 mb-6">Lineups can no longer be edited. Contact the commissioner if you need a change made.</p>
        <a href="/leaderboard" className="inline-block bg-masters-green text-white font-bold px-6 py-3 rounded-lg">View Leaderboard →</a>
      </div>
    );
  }

  if (step === "auth") {
    return (
      <div className="max-w-sm mx-auto px-4 py-20">
        <h1 className="text-2xl font-serif font-bold text-masters-green mb-2">Edit Your Lineup</h1>
        {entry && <p className="text-sm text-gray-500 mb-6">Entry: <strong>{entry.userName}</strong></p>}
        <label className="block text-sm font-semibold text-gray-700 mb-1">Personal Code</label>
        <input
          type="text"
          placeholder="Enter your personal edit code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green"
        />
        {authError && <p className="text-red-600 text-sm mb-3">{authError}</p>}
        <button onClick={handleAuth} className="w-full bg-masters-green text-white font-bold py-2 rounded-lg hover:bg-green-800">
          Continue →
        </button>
        <p className="text-xs text-gray-400 mt-4 text-center">No code? Contact the commissioner.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-masters-green">Edit Lineup</h1>
          <p className="text-sm text-gray-500 mt-1">Changes save immediately. Contest locks Thu Apr 9 at 7:45 AM ET.</p>
        </div>
        <a href="/leaderboard" className="text-sm text-masters-green underline">← Back</a>
      </div>

      {/* Entry name */}
      <div className="mb-4 max-w-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Entry Name</label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          maxLength={100}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        <div className="lg:sticky lg:top-6 self-start flex flex-col gap-4">
          <SalaryTracker totalSalary={totalSalary} selectedCount={selectedPlayers.length} />

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Roster ({selectedPlayers.length}/{ROSTER_SIZE})
            </h2>
            <RosterBuilder selectedPlayers={selectedPlayers} onRemove={removePlayer} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Public Message</label>
            <input
              type="text"
              placeholder="Optional — shown after lock"
              value={publicMessage}
              onChange={(e) => setPublicMessage(e.target.value)}
              maxLength={200}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green"
            />
          </div>

          {saveError && <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">{saveError}</div>}

          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="w-full bg-masters-green text-white font-bold py-3 rounded-lg shadow hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes →"}
          </button>
        </div>
      </div>
    </div>
  );
}
