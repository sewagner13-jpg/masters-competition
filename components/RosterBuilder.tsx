"use client";

import { Player } from "./PlayerTable";

interface Props {
  selectedPlayers: Player[];
  onRemove: (player: Player) => void;
}

export function RosterBuilder({ selectedPlayers, onRemove }: Props) {
  if (selectedPlayers.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
        Select 6 players from the list
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedPlayers.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2"
        >
          <span className="font-medium text-sm text-gray-900">{p.name}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-gray-600">
              ${p.salary.toLocaleString()}
            </span>
            <button
              onClick={() => onRemove(p)}
              className="text-red-400 hover:text-red-600 text-lg leading-none"
              title="Remove"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
