"use client";

import { SALARY_CAP, ROSTER_SIZE } from "@/lib/constants";

interface Props {
  totalSalary: number;
  selectedCount: number;
}

export function SalaryTracker({ totalSalary, selectedCount }: Props) {
  const remaining = SALARY_CAP - totalSalary;
  const pct = Math.min((totalSalary / SALARY_CAP) * 100, 100);
  const overCap = totalSalary > SALARY_CAP;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2 text-sm font-medium">
        <span className="text-gray-600">
          Players: <span className="text-masters-green font-bold">{selectedCount}/{ROSTER_SIZE}</span>
        </span>
        <span className={overCap ? "text-red-600 font-bold" : "text-gray-600"}>
          {overCap ? "OVER CAP" : `$${remaining.toLocaleString()} remaining`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            overCap ? "bg-red-500" : pct > 90 ? "bg-yellow-500" : "bg-masters-green"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>$0</span>
        <span className={overCap ? "text-red-500 font-semibold" : ""}>
          ${totalSalary.toLocaleString()} used
        </span>
        <span>${SALARY_CAP.toLocaleString()} cap</span>
      </div>
    </div>
  );
}
