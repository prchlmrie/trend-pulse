const KEY = 'trendpulse_watchlist';

export function getWatchlist(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

export function addToWatchlist(trendId: number): void {
  const ids = getWatchlist();
  if (!ids.includes(trendId)) {
    localStorage.setItem(KEY, JSON.stringify([...ids, trendId]));
  }
}

export function removeFromWatchlist(trendId: number): void {
  localStorage.setItem(KEY, JSON.stringify(getWatchlist().filter((id) => id !== trendId)));
}

export function isWatchlisted(trendId: number): boolean {
  return getWatchlist().includes(trendId);
}
