import { LRUCache } from "lru-cache";

interface Key { kind: "search" | "trending" | "channels"; q?: string; region?: string; }

const cache = new LRUCache<string, string>({
  max: 500,
  ttl: 1000 * 60 * 30, // 30 min
});

function key(k: Key) { return JSON.stringify(k); }

export function getTokenForPage(k: Key, page: number): string | undefined {
  if (page <= 1) return undefined;
  return cache.get(`${key(k)}::${page}`);
}

export function storeTokenForPage(k: Key, page: number, token?: string) {
  if (!token) return;
  cache.set(`${key(k)}::${page + 1}`, token);
}
