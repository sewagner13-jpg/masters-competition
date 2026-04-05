"use client";

import { useEffect, useState } from "react";
import { LOCK_DEADLINE } from "@/lib/constants";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getTimeLeft() {
  const diff = LOCK_DEADLINE.getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSecs = Math.floor(diff / 1000);
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  const secs  = totalSecs % 60;
  return { days, hours, mins, secs, totalSecs };
}

export function LockCountdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Already locked
  if (!timeLeft) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-center text-sm font-semibold text-red-700">
        🔒 Entries are closed · Contest is locked
      </div>
    );
  }

  const isUrgent = timeLeft.totalSecs < 3600;          // < 1 hour
  const isWarning = timeLeft.totalSecs < 86400;         // < 24 hours

  if (isUrgent) {
    return (
      <div className="rounded-xl bg-red-50 border-2 border-red-400 px-4 py-3 text-center animate-pulse">
        <p className="text-red-700 font-bold text-sm mb-1">⚠️ Entries close very soon!</p>
        <p className="font-mono text-2xl font-bold text-red-600">
          {pad(timeLeft.hours)}:{pad(timeLeft.mins)}:{pad(timeLeft.secs)}
        </p>
        <p className="text-xs text-red-500 mt-0.5">Thu Apr 9 · 7:45 AM ET</p>
      </div>
    );
  }

  if (isWarning) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-center">
        <p className="text-amber-700 font-semibold text-xs mb-1">⏰ Entries close in less than 24 hours</p>
        <p className="font-mono text-xl font-bold text-amber-700">
          {pad(timeLeft.hours)}h {pad(timeLeft.mins)}m {pad(timeLeft.secs)}s
        </p>
        <p className="text-xs text-amber-500 mt-0.5">Thu Apr 9 · 7:45 AM ET</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-center">
      <p className="text-xs text-gray-500 mb-0.5">Entries close</p>
      <p className="font-mono text-base font-semibold text-gray-700">
        {timeLeft.days}d {pad(timeLeft.hours)}h {pad(timeLeft.mins)}m
      </p>
      <p className="text-xs text-gray-400">Thu Apr 9 · 7:45 AM ET</p>
    </div>
  );
}
