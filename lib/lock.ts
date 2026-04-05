/**
 * Contest lock helpers.
 *
 * A contest is locked when EITHER:
 *   1. Current time >= LOCK_DEADLINE  (automatic)
 *   2. ContestSettings.lockedAt is set (commissioner manual lock)
 *
 * The commissioner can force-unlock (isForceUnlocked=true) to re-open
 * submissions past the deadline.
 */

import { LOCK_DEADLINE } from "./constants";

export interface LockState {
  isLocked: boolean;
  reason: "deadline" | "manual" | "open";
}

/**
 * Determine lock state from settings row.
 * Pass the ContestSettings DB row (or null if not yet created).
 */
export function getLockState(settings: {
  isForceUnlocked: boolean;
  lockedAt: Date | null;
} | null): LockState {
  const now = new Date();

  // Force-unlock overrides everything
  if (settings?.isForceUnlocked) {
    return { isLocked: false, reason: "open" };
  }

  // Manual lock by commissioner
  if (settings?.lockedAt && now >= settings.lockedAt) {
    return { isLocked: true, reason: "manual" };
  }

  // Automatic deadline
  if (now >= LOCK_DEADLINE) {
    return { isLocked: true, reason: "deadline" };
  }

  return { isLocked: false, reason: "open" };
}

/** Quick boolean — isLocked right now given settings */
export function isContestLocked(settings: Parameters<typeof getLockState>[0]): boolean {
  return getLockState(settings).isLocked;
}
