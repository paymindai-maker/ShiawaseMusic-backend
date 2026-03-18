import dotenv from "dotenv";

dotenv.config();

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  port: toNumber(process.env.PORT, 3000),
  ytDlpPath: process.env.YTDLP_PATH || "yt-dlp",
  youtubeApiKey: process.env.YOUTUBE_API_KEY || "",

  maxConcurrency: toNumber(process.env.MAX_CONCURRENCY, 3),

  searchCacheTtlMs: toNumber(process.env.SEARCH_CACHE_TTL_MS, 15 * 60 * 1000),
  streamCacheTtlMs: toNumber(process.env.STREAM_CACHE_TTL_MS, 2 * 60 * 60 * 1000),

  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 60 * 1000),
  rateLimitMaxRequests: toNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 40),
  rateLimitMaxStreamRequests: toNumber(process.env.RATE_LIMIT_MAX_STREAM_REQUESTS, 20),

  requestTimeoutMs: toNumber(process.env.REQUEST_TIMEOUT_MS, 10000),
};

if (!env.youtubeApiKey) {
  console.warn("[WARN] YOUTUBE_API_KEY is missing");
}