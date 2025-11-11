// /lib/utils/date.ts

/**
 * Returns a human-readable "time ago" string (e.g., "5m ago", "2h ago").
 * Adjusts automatically to the user's local timezone.
 * Works correctly for Kathmandu (UTC+5:45) and all other zones.
 */
export function getTimeAgo(timestamp: string | Date): string {
  if (!timestamp) return "";

  // Parse the timestamp safely
  const then = new Date(timestamp);
  const now = new Date();

  // Convert both to UTC timestamps (milliseconds)
  const diffSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffSeconds < 60) return "just now";

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function getTimeAgoKathmandu(timestamp: string | Date): string {
  const kathmanduNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" })
  );
  const kathmanduThen = new Date(
    new Date(timestamp).toLocaleString("en-US", { timeZone: "Asia/Kathmandu" })
  );

  const diffSeconds = Math.floor(
    (kathmanduNow.getTime() - kathmanduThen.getTime()) / 1000
  );

  if (diffSeconds < 60) return "just now";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}
