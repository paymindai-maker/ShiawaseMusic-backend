import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest } from "../utils/errors.js";
import { isValidVideoId } from "../utils/validators.js";
import { getStreamForVideo } from "../services/stream.service.js";

const router = Router();

router.get(
  "/:videoId",
  asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidVideoId(videoId)) {
      throw badRequest("INVALID_VIDEO_ID", "Invalid videoId");
    }

    const data = await getStreamForVideo(videoId);

    const url = typeof data === "string" ? data : data?.url;

    if (!url) {
      return res.status(502).json({
        error: {
          code: "STREAM_URL_MISSING",
          message: "Resolved stream URL is missing",
        },
      });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, url);
  })
);

export default router;