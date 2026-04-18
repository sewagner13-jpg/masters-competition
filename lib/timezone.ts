/**
 * Timezone helpers for sync window checking.
 * All sync scheduling uses America/New_York as the reference timezone.
 */

import { SYNC_SEASON_END, SYNC_SEASON_START } from "./constants";

export function getNowInEastern(): Date {
  // Use Intl to get the current time in ET
  const etString = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
  return new Date(etString);
}

export function isWithinSyncSeason(): boolean {
  const now = new Date();
  return now >= SYNC_SEASON_START && now < SYNC_SEASON_END;
}

export function isWithinSyncWindow(): boolean {
  if (!isWithinSyncSeason()) {
    return false;
  }

  const startHour = parseInt(process.env.SYNC_START_HOUR_ET ?? "6", 10);
  const endHour = parseInt(process.env.SYNC_END_HOUR_ET ?? "21", 10);

  const nowET = getNowInEastern();
  const hour = nowET.getHours();

  return hour >= startHour && hour < endHour;
}
