"use client";

interface Props {
  lastSyncedAt: string | null;
}

export function LastUpdatedBanner({ lastSyncedAt }: Props) {
  if (!lastSyncedAt) {
    return (
      <div className="text-xs text-gray-400 text-center">
        Stats not yet synced — scores show as E (even) until tournament data is available.
      </div>
    );
  }

  const date = new Date(lastSyncedAt);
  const formatted = date.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <div className="text-xs text-gray-400 text-center">
      Last updated: {formatted}
    </div>
  );
}
