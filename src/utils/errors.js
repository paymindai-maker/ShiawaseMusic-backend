export class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(code, message, details = null) {
  return new AppError(400, code, message, details);
}

export function tooManyRequests(message = "Too many requests") {
  return new AppError(429, "RATE_LIMITED", message);
}

export function internalError(message = "Internal server error", details = null) {
  return new AppError(500, "INTERNAL_ERROR", message, details);
}