"use client";

import { useState } from "react";
import { ROSTER_SIZE, SALARY_CAP } from "@/lib/constants";

export interface Player {
  id: string;
  name: string;
  salary: number;
  isActive: boolean;
}

type SortKey = "salary_desc" | "salary_asc" | "name_asc" | "name_desc";

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
  const [sort, setSort] = useState<SortKey>("salary_desc");

  const filtered = players
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "salary_desc") return b.salary - a.salary;
      if (sort === "salary_asc")  return a.salary - b.salary;
      if (sort === "name_asc")    return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });

  function cycleSalarySort() {
    setSort((s) => s === "salary_desc" ? "salary_asc" : "salary_desc");
  }
  function cycleNameSort() {
    setSort((s) => s === "name_asc" ? "name_desc" : "name_asc");
  }

  const sortIcon = (key: "name" | "salary") => {
    if (key === "name") {
      if (sort === "name_asc")  return " ↑";
      if (sort === "name_desc") return " ↓";
    }
    if (key === "salary") {
      if (sort === "salary_desc") return " ↓";
      if (sort === "salary_asc")  return " ↑";
    }
    return "";
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <input
        type="text"
        placeholder="Search players by name..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green"
      />

      {/* Table */}
      <div className="overflow-y-auto max-h-[480px] md:max-h-[560px] border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-masters-green text-white sticky top-0 z-10">
            <tr>
              <th className="text-left px-3 py-2.5 font-semibold">
                <button
                  onClick={cycleNameSort}
                  className="hover:text-masters-gold transition-colors text-left w-full"
                >
                  Player{sortIcon("name")}
                </button>
              </th>
              <th className="text-right px-3 py-2.5 font-semibold">
                <button
                  onClick={cycleSalarySort}
                  className="hover:text-masters-gold transition-colors w-full text-right"
                >
                  Salary{sortIcon("salary")}
                </button>
              </th>
              <th className="text-center px-3 py-2.5 font-semibold w-16">Pick</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((player, idx) => {
              const isSelected    = selectedIds.has(player.id);
              const wouldExceedCap = !isSelected && totalSalary + player.salary > SALARY_CAP;
              const rosterFull    = !isSelected && selectedIds.size >= ROSTER_SIZE;
              const disabled      = wouldExceedCap || rosterFull;

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
                  <td className="px-3 py-2.5 font-medium text-gray-900">{player.name}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700 font-mono text-xs">
                    ${player.salary.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); if (!disabled) onToggle(player); }}
                      disabled={disabled}
                      className={`w-7 h-7 rounded-full border-2 text-xs font-bold transition-colors ${
                        isSelected
                          ? "bg-masters-green border-masters-green text-white"
                          : disabled
                          ? "border-gray-300 text-gray-300"
                          : "border-masters-green text-masters-green hover:bg-masters-green hover:text-white"
                      }`}
                      title={isSelected ? "Remove" : rosterFull ? "Roster full" : wouldExceedCap ? "Would exceed cap" : "Add"}
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
      <p className="text-xs text-gray-400 text-right">{filtered.length} players · tap column header to sort</p>
    </div>
  );
}
