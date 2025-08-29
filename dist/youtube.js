// src/youtube.ts
const YT_API = "https://www.googleapis.com/youtube/v3";
const YT_KEY = process.env.YOUTUBE_API_KEY;
function qs(params) {
    const url = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null)
            url.set(k, String(v));
    });
    return url.toString();
}
export async function ytSearch(params) {
    const url = `${YT_API}/search?${qs({ key: YT_KEY, ...params })}`;
    const r = await fetch(url);
    if (!r.ok)
        throw new Error(`YouTube search failed: ${r.status}`);
    return r.json();
}
export async function ytVideos(params) {
    const url = `${YT_API}/videos?${qs({ key: YT_KEY, ...params })}`;
    const r = await fetch(url);
    if (!r.ok)
        throw new Error(`YouTube videos failed: ${r.status}`);
    return r.json();
}
export async function ytChannels(params) {
    const url = `${YT_API}/channels?${qs({ key: YT_KEY, ...params })}`;
    const r = await fetch(url);
    if (!r.ok)
        throw new Error(`YouTube channels failed: ${r.status}`);
    return r.json();
}
