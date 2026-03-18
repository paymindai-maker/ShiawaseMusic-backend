import { execFile } from "child_process";
import { promisify } from "util";
import pLimit from "p-limit";
import { env } from "../config/env.js";
import { TTLCache } from "../utils/cache.js";
import { internalError } from "../utils/errors.js";

const execFileAsync = promisify(execFile);
const limit = pLimit(env.maxConcurrency);

const streamCache = new TTLCache(env.streamCacheTtlMs);
const inflight = new Map();

async function runYtDlp(youtubeUrl) {
  const { stdout } = await limit(() =>
    execFileAsync(
      env.ytDlpPath,
      [
        "-f",
        "bestaudio[ext=m4a]/bestaudio",
        "-g",
        "--no-playlist",
        youtubeUrl,
      ],
      {
        timeout: env.requestTimeoutMs,
        maxBuffer: 1024 * 1024,
      }
    )
  );

  const streamUrl = stdout.trim();

  if (!streamUrl.startsWith("http")) {
    throw new Error("Invalid stream URL returned by yt-dlp");
  }

  return streamUrl;
}

async function resolveStreamWithRetry(youtubeUrl, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await runYtDlp(youtubeUrl);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

export async function getStreamForVideo(videoId) {
  const cached = streamCache.get(videoId);
  if (cached) {
    return {
      ...cached,
      cached: true,
    };
  }

  if (inflight.has(videoId)) {
    return inflight.get(videoId);
  }

  const promise = (async () => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      const streamUrl = await resolveStreamWithRetry(youtubeUrl, 2);

      const payload = {
        streamUrl,
        resolvedAt: Date.now(),
      };

      streamCache.set(videoId, payload);
      return {
        ...payload,
        cached: false,
      };
    } catch (err) {
      throw internalError("Failed to resolve stream", err.message);
    } finally {
      inflight.delete(videoId);
    }
  })();

  inflight.set(videoId, promise);
  return promise;
}