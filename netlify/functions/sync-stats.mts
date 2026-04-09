/**
 * Netlify Scheduled Function — sync Masters stats every 15 minutes.
 *
 * Schedule: runs broadly on a cron schedule. The function itself
 * checks whether the current time is within the ET sync window
 * and exits early if not.
 *
 * Cron: "0,15,30,45 * * * *"  — every 15 minutes, all hours UTC
 * The ET window guard (SYNC_START_HOUR_ET / SYNC_END_HOUR_ET) controls
 * when actual syncing happens.
 *
 * Netlify docs: https://docs.netlify.com/functions/scheduled-functions/
 */

import type { Config } from "@netlify/functions";

export default async function handler() {
  // Import sync logic — uses the app's lib directly
  // Note: Netlify bundles this with esbuild, so ESM imports work.
  const { runStatSync } = await import("../../lib/stats/sync.js");

  console.log("[sync-stats] Scheduled function triggered");

  const result = await runStatSync({ forceSync: false });

  console.log(`[sync-stats] Result: ${result.status} — ${result.message}`);

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
}

export const config: Config = {
  schedule: "* * * * *", // every minute — live scoring during Masters week
};
