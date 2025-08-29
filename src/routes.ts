// src/routes.ts
import { Router, Request, Response } from "express";
import { ytSearch, ytVideos } from "./youtube.js";
import { getTokenForPage, storeTokenForPage } from "./pagination.js";
import type { ItemDto, Paged, VideoData, ChannelData } from "./types.js";

const router = Router();

// Utility: humanize publishedAt → "x days ago"
function timeAgo(iso?: string): string | undefined {
  if (!iso) return undefined;
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(1, Math.floor((now - then) / 1000));
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Number.MAX_SAFE_INTEGER, "year"],
  ];
  let val = diff;
  let unit = "second";
  for (let i = 0; i < units.length; i++) {
    const [base, name] = units[i];
    if (val < base) {
      unit = name;
      break;
    }
    val = Math.floor(val / base);
  }
  return `${val} ${unit}${val > 1 ? "s" : ""} ago`;
}

// ---- SUGGEST (simple heuristic) ----
router.get("/v1/suggest", async (req: Request, res: Response) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ suggestions: [] });
  try {
    const search = await ytSearch({
      part: "snippet",
      type: "video",
      maxResults: 10,
      q,
    });
    const set = new Set<string>();
    for (const it of search.items || []) {
      const t: string | undefined = it?.snippet?.title;
      if (t) set.add(t);
      if (set.size >= 10) break;
    }
    res.json({ suggestions: Array.from(set) });
  } catch {
    res.status(200).json({ suggestions: [] });
  }
});

// ---- TRENDING ----
router.get("/v1/trending", async (req: Request, res: Response) => {
  const region = String(req.query.region || "US");
  const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
  try {
    const token = getTokenForPage({ kind: "trending", region }, page);
    const data = await ytVideos({
      part: "snippet,statistics,contentDetails",
      chart: "mostPopular",
      regionCode: region,
      maxResults: 20,
      pageToken: token,
    });

    const items: ItemDto[] = (data.items || []).map((v: any): ItemDto => ({
      type: "video",
      data: {
        id: v.id,
        title: v.snippet?.title,
        channelId: v.snippet?.channelId,
        channelName: v.snippet?.channelTitle,
        viewCount: v.statistics ? Number(v.statistics.viewCount || 0) : undefined,
        publishedText: timeAgo(v.snippet?.publishedAt),
      } as VideoData,
    }));

    const nextToken: string | undefined = data.nextPageToken;
    storeTokenForPage({ kind: "trending", region }, page, nextToken);
    res.json({ items, nextPage: nextToken ? page + 1 : null } as Paged<ItemDto>);
  } catch (e: any) {
    res.status(500).json({ items: [], nextPage: null, error: e?.message });
  }
});

// ---- SEARCH (videos + lightweight stats) ----
router.get("/v1/search", async (req: Request, res: Response) => {
  const q = String(req.query.q || "");
  const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
  if (!q) return res.json({ items: [], nextPage: null });

  try {
    const token = getTokenForPage({ kind: "search", q }, page);
    const s = await ytSearch({
      part: "snippet",
      type: "video,channel",
      maxResults: 20,
      q,
      pageToken: token,
    });

    const videoIds = (s.items || [])
      .filter((it: any) => it.id?.kind === "youtube#video")
      .map((it: any) => it.id.videoId)
      .filter(Boolean);

    const vidStats = videoIds.length
      ? await ytVideos({ part: "statistics,snippet", id: videoIds.join(",") })
      : { items: [] as any[] };

    const statsById = new Map<string, any>();
    for (const v of vidStats.items || []) statsById.set(v.id, v);

    const items: ItemDto[] = (s.items || []).map((it: any): ItemDto => {
      if (it.id?.kind === "youtube#channel") {
        const c: ChannelData = {
          id: it.id.channelId,
          title: it.snippet?.title,
          avatar:
            it.snippet?.thumbnails?.default?.url ||
            it.snippet?.thumbnails?.high?.url,
        };
        return { type: "channel", data: c };
      }
      const id = it.id?.videoId;
      const ref = id ? statsById.get(id) : undefined;
      const v: VideoData = {
        id,
        title: it.snippet?.title,
        channelId: it.snippet?.channelId,
        channelName: it.snippet?.channelTitle,
        viewCount: ref ? Number(ref.statistics?.viewCount || 0) : undefined,
        publishedText: timeAgo(it.snippet?.publishedAt),
      };
      return { type: "video", data: v };
    });

    const nextToken: string | undefined = s.nextPageToken;
    storeTokenForPage({ kind: "search", q }, page, nextToken);
    res.json({ items, nextPage: nextToken ? page + 1 : null } as Paged<ItemDto>);
  } catch (e: any) {
    res.status(500).json({ items: [], nextPage: null, error: e?.message });
  }
});

// ---- CHANNELS ----
router.get("/v1/channels", async (req: Request, res: Response) => {
  const q = String(req.query.q || "");
  const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
  if (!q) return res.json({ items: [], nextPage: null });
  try {
    const token = getTokenForPage({ kind: "channels", q }, page);
    const s = await ytSearch({
      part: "snippet",
      type: "channel",
      maxResults: 20,
      q,
      pageToken: token,
    });

    const items: ItemDto[] = (s.items || []).map((it: any): ItemDto => ({
      type: "channel",
      data: {
        id: it.id?.channelId,
        title: it.snippet?.title,
        avatar:
          it.snippet?.thumbnails?.default?.url ||
          it.snippet?.thumbnails?.high?.url,
      } as ChannelData,
    }));

    const nextToken: string | undefined = s.nextPageToken;
    storeTokenForPage({ kind: "channels", q }, page, nextToken);
    res.json({ items, nextPage: nextToken ? page + 1 : null } as Paged<ItemDto>);
  } catch (e: any) {
    res.status(500).json({ items: [], nextPage: null, error: e?.message });
  }
});

export default router;
