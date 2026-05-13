// Browser-local cache for the last 5 real companies the user has fetched.
// Each entry stores enough to rehydrate the dashboard instantly without
// re-calling MUNS, plus a fetched-at timestamp so the UI can label staleness.

const STORAGE_KEY = "kmpDashboard.recentCompanies.v1";
const MAX_ENTRIES = 5;

function safeRead() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(entries) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota / private-mode failures — silently drop, the in-memory copy still works.
  }
}

export function loadRecentCompanies() {
  return safeRead().slice(0, MAX_ENTRIES);
}

// Upserts an entry to the front (LRU). Identity is the uppercased ticker.
export function upsertRecentCompany(existing, entry) {
  if (!entry || !entry.ticker) return existing;
  const key = entry.ticker.toUpperCase();
  const filtered = (existing || []).filter(
    (item) => (item?.ticker || "").toUpperCase() !== key,
  );
  const next = [{ ...entry, ticker: entry.ticker }, ...filtered].slice(0, MAX_ENTRIES);
  safeWrite(next);
  return next;
}

export function removeRecentCompany(existing, ticker) {
  if (!ticker) return existing;
  const key = ticker.toUpperCase();
  const next = (existing || []).filter(
    (item) => (item?.ticker || "").toUpperCase() !== key,
  );
  safeWrite(next);
  return next;
}

export function findRecentCompany(entries, ticker) {
  if (!ticker) return null;
  const key = ticker.toUpperCase();
  return (
    (entries || []).find((item) => (item?.ticker || "").toUpperCase() === key) ||
    null
  );
}

// Sum the .records arrays inside a stored liveRecords blob — used for the
// per-card stat tiles on the Companies view.
export function countsFromLiveRecords(liveRecords) {
  const safe = (kind) => liveRecords?.[kind]?.records?.length || 0;
  return {
    appointments: safe("appointments"),
    resignations: safe("resignations"),
    terminations: safe("terminations"),
    retirements: safe("retirements"),
  };
}
