import { AppError } from "../utils/errors.js";

export function errorHandler(err, req, res, next) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
  const message = err.message || "Internal server error";

  if (statusCode >= 500) {
    console.error("[ERROR]", {
      method: req.method,
      path: req.originalUrl,
      code,
      message,
      stack: err.stack,
    });
  }

  return res.status(statusCode).json({
    error: {
      code,
      message,
      details: err.details || null,
    },
  });
}