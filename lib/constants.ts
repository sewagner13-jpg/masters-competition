export const SALARY_CAP = 50_000;
export const ROSTER_SIZE = 6;
export const EVENT_NAME = "2026 Masters Tournament";
export const APP_NAME = "Sunday Church Masters Competition";
export const BUY_IN = 50;

// Contest lock deadline — Thursday April 9 2026, 7:45am ET
// After this time no new entries or edits (unless commissioner override)
export const LOCK_DEADLINE = new Date("2026-04-09T07:45:00-04:00");

// Stats should only sync during the 2026 Masters scoring window.
// This intentionally stops all future syncs after the Masters wraps.
export const SYNC_SEASON_START = new Date("2026-04-09T00:00:00-04:00");
export const SYNC_SEASON_END = new Date("2026-04-13T01:00:00-04:00");

// Commissioner master code is read from env server-side only
// Set COMMISSIONER_CODE in .env / Netlify env vars
// Default "1110" matches the agreed code — override in production env
export const COMMISSIONER_CODE = process.env.COMMISSIONER_CODE ?? "1110";
