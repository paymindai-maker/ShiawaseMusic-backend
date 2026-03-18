import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { createRateLimiter } from "./middleware/rateLimiter.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

import healthRoutes from "./routes/health.routes.js";
import searchRoutes from "./routes/search.routes.js";
import streamRoutes from "./routes/stream.routes.js";
import songRoutes from "./routes/song.routes.js";

const app = express();

app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(requestLogger);

const generalLimiter = createRateLimiter({
  windowMs: env.rateLimitWindowMs,
  maxRequests: env.rateLimitMaxRequests,
});

const streamLimiter = createRateLimiter({
  windowMs: env.rateLimitWindowMs,
  maxRequests: env.rateLimitMaxStreamRequests,
});

app.get("/", (req, res) => {
  res.send("Music backend running");
});

app.use("/health", healthRoutes);
app.use("/search", generalLimiter, searchRoutes);
app.use("/songs", generalLimiter, songRoutes);
app.use("/stream", streamLimiter, streamRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;