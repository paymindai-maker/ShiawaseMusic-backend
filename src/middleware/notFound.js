import { AppError } from "../utils/errors.js";

export function notFound(req, res, next) {
  next(new AppError(404, "NOT_FOUND", "Route not found"));
}