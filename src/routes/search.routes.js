import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest } from "../utils/errors.js";
import { normalizeQuery, isValidSearchQuery } from "../utils/validators.js";
import { searchVideos } from "../services/youtube.service.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = normalizeQuery(req.query.q);
    const pageToken = String(req.query.pageToken || "").trim();

    if (!isValidSearchQuery(q)) {
      throw badRequest("INVALID_QUERY", "Query must be at least 2 characters");
    }

    const data = await searchVideos(q, pageToken);

    res.json(data);
  })
);

export default router;