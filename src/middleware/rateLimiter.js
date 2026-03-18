import { tooManyRequests } from "../utils/errors.js";

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

export function createRateLimiter({
  windowMs,
  maxRequests,
  keyGenerator = getClientIp,
}) {
  const requests = new Map();

  return function rateLimiter(req, res, next) {
    const key = keyGenerator(req);
    const now = Date.now();

    const timestamps = requests.get(key) || [];
    const fresh = timestamps.filter(ts => now - ts < windowMs);

    if (fresh.length >= maxRequests) {
      return next(tooManyRequests());
    }

    fresh.push(now);
    requests.set(key, fresh);
    next();
  };
}