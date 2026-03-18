import axios from "axios";
import { env } from "../config/env.js";
import { TTLCache } from "../utils/cache.js";
import { internalError, badRequest } from "../utils/errors.js";
import { parseIsoDurationToSeconds } from "../utils/duration.js";

const searchCache = new TTLCache(env.searchCacheTtlMs);
const songCache = new TTLCache(12 * 60 * 60 * 1000); // 12 hours

const inflightSongRequests = new Map();

function makeSearchCacheKey(query, pageToken = "") {
  return `${query.toLowerCase()}::${pageToken}`;
}

function mapVideoItem(item) {
  const snippet = item.snippet || {};
  const thumbnails = snippet.thumbnails || {};
  const contentDetails = item.contentDetails || {};
  const statistics = item.statistics || {};

  const duration = contentDetails.duration || "PT0S";
  const durationSeconds = parseIsoDurationToSeconds(duration);

  return {
    videoId: item.id,
    title: snippet.title || "",
    channel: snippet.channelTitle || "",
    thumbnail:
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      "",
    duration,
    durationSeconds,
    publishedAt: snippet.publishedAt || "",
    description: snippet.description || "",
    viewCount: statistics.viewCount || null,
  };
}

async function fetchVideosByIds(videoIds) {
  if (!videoIds.length) return [];

  try {
    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        timeout: env.requestTimeoutMs,
        params: {
          key: env.youtubeApiKey,
          part: "snippet,contentDetails,statistics",
          id: videoIds.join(","),
          maxResults: videoIds.length,
        },
      }
    );

    return (response.data.items || []).map(mapVideoItem);
  } catch (err) {
    throw internalError(
      "Failed to fetch video details",
      err.response?.data || err.message
    );
  }
}

export async function searchVideos(query, pageToken = "") {
  const cacheKey = makeSearchCacheKey(query, pageToken);
  const cached = searchCache.get(cacheKey);

  if (cached) {
    return { ...cached, cached: true };
  }

  try {
    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        timeout: env.requestTimeoutMs,
        params: {
          part: "snippet",
          q: query,
          key: env.youtubeApiKey,
          maxResults: 10,
          type: "video",
          pageToken: pageToken || undefined,
        },
      }
    );

    const items = response.data.items || [];
    const videoIds = items
      .map(item => item?.id?.videoId)
      .filter(Boolean);

    const detailedVideos = await fetchVideosByIds(videoIds);
    const detailMap = new Map(detailedVideos.map(video => [video.videoId, video]));

    const results = videoIds
      .map(videoId => detailMap.get(videoId))
      .filter(Boolean);

    const payload = {
      results,
      nextPageToken: response.data.nextPageToken || null,
      cached: false,
    };

    searchCache.set(cacheKey, payload);
    return payload;
  } catch (err) {
    throw internalError("Search failed", err.response?.data || err.message);
  }
}

export async function getVideoDetails(videoId) {
  const cached = songCache.get(videoId);
  if (cached) {
    return { ...cached, cached: true };
  }

  if (inflightSongRequests.has(videoId)) {
    return inflightSongRequests.get(videoId);
  }

  const promise = (async () => {
    try {
      const items = await fetchVideosByIds([videoId]);
      const song = items[0];

      if (!song) {
        throw badRequest("VIDEO_NOT_FOUND", "Video not found");
      }

      songCache.set(videoId, song);
      return { ...song, cached: false };
    } finally {
      inflightSongRequests.delete(videoId);
    }
  })();

  inflightSongRequests.set(videoId, promise);
  return promise;
}