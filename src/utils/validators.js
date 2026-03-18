const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function normalizeQuery(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function isValidSearchQuery(q) {
  return q.length >= 2;
}

export function isValidVideoId(videoId) {
  return YOUTUBE_VIDEO_ID_REGEX.test(videoId);
}