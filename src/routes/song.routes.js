import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest } from "../utils/errors.js";
import { isValidVideoId } from "../utils/validators.js";
import { getVideoDetails } from "../services/youtube.service.js";

const router = Router();

router.get(
  "/:videoId",
  asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidVideoId(videoId)) {
      throw badRequest("INVALID_VIDEO_ID", "Invalid videoId");
    }

    const data = await getVideoDetails(videoId);
    res.json(data);
  })
);

export default router;