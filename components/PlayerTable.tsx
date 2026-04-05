"use client";

import { ROSTER_SIZE, SALARY_CAP } from "@/lib/constants";

export interface Player {
  id: string;
  name: string;
  salary: number;
  isActive: boolean;
}

interface Props {
  players: Player[];
  selectedIds: Set<string>;
  totalSalary: number;
  onToggle: (player: Player) => void;
  search: string;
  onSearchChange: (v: string) => void;
}

export function PlayerTable({
  players,
  selectedIds,
  totalSalary,
  onToggle,
  search,
  onSearchChange,
}: Props) {
  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <input
        type="text"
        placeholder="Search players..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green"
      />

      {/* Table */}
      <div className="overflow-y-auto max-h-[520px] border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-masters-green text-white sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Player</th>
              <th className="text-right px-4 py-2 font-semibold">Salary</th>
              <th className="text-center px-4 py-2 font-semibold w-20">Pick</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((player, idx) => {
              const isSelected = selectedIds.has(player.id);
              const wouldExceedCap =
                !isSelected &&
                totalSalary + player.salary > SALARY_CAP;
              const rosterFull =
                !isSelected && selectedIds.size >= ROSTER_SIZE;
              const disabled = wouldExceedCap || rosterFull;

              return (
                <tr
                  key={player.id}
                  className={`border-t border-gray-100 ${
                    isSelected
                      ? "bg-green-50"
                      : idx % 2 === 0
                      ? "bg-white"
                      : "bg-gray-50/50"
                  } ${disabled ? "opacity-40" : "hover:bg-green-50/50 cursor-pointer"}`}
                  onClick={() => !disabled && onToggle(player)}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {player.name}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700 font-mono">
                    ${player.salary.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled) onToggle(player);
                      }}
                      disabled={disabled}
                      className={`w-7 h-7 rounded-full border-2 text-xs font-bold transition-colors ${
                        isSelected
                          ? "bg-masters-green border-masters-green text-white"
                          : disabled
                          ? "border-gray-300 text-gray-300"
                          : "border-masters-green text-masters-green hover:bg-masters-green hover:text-white"
                      }`}
                      title={
                        isSelected
                          ? "Remove"
                          : rosterFull
                          ? "Roster full"
                          : wouldExceedCap
                          ? "Would exceed cap"
                          : "Add"
                      }
                    >
                      {isSelected ? "✓" : "+"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">
            No players found for &ldquo;{search}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
