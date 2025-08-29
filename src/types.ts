// src/types.ts
export type ItemDto =
| { type: "video"; data: VideoData }
| { type: "channel"; data: ChannelData };


export interface VideoData {
id: string;
title: string;
channelId?: string;
channelName?: string;
viewCount?: number;
publishedText?: string; // e.g., "2 days ago"
}


export interface ChannelData {
id: string;
title?: string;
avatar?: string; // thumbnail URL
}


export interface Paged<T> {
items: T[];
nextPage: number | null; // Int page for your ViewModel
}