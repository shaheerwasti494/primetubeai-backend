import { LRUCache } from "lru-cache";
const cache = new LRUCache({
    max: 500,
    ttl: 1000 * 60 * 30, // 30 min
});
function key(k) { return JSON.stringify(k); }
export function getTokenForPage(k, page) {
    if (page <= 1)
        return undefined;
    return cache.get(`${key(k)}::${page}`);
}
export function storeTokenForPage(k, page, token) {
    if (!token)
        return;
    cache.set(`${key(k)}::${page + 1}`, token);
}
