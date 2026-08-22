/**
 * In-memory rolling 24h error counter for the Monitor push (see
 * src/modules/monitor/monitor.service.ts). Deliberately not persisted: a
 * process restart resetting history is fine here — it just means the
 * window starts filling again, same shape as a real drop in error rate
 * would look from the outside. Entries older than 24h are pruned lazily
 * on read/write rather than on a timer, since this only needs to be
 * accurate at report time (every 5 minutes).
 */

const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_RECENT = 5;
const MAX_ENTRIES = 2000; // hard cap so a runaway error loop can't grow this unbounded between prunes

type Entry = { message: string; at: number };

const entries: Entry[] = [];

function prune(now: number): void {
  const cutoff = now - WINDOW_MS;
  while (entries.length && entries[0].at < cutoff) {
    entries.shift();
  }
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
}

export function recordError(message: string): void {
  const now = Date.now();
  entries.push({ message: message.slice(0, 200), at: now });
  prune(now);
}

export function readErrorCounter(): { count24h: number; recent: string[] } {
  prune(Date.now());
  return {
    count24h: entries.length,
    recent: entries
      .slice(-MAX_RECENT)
      .reverse()
      .map((e) => e.message),
  };
}
