// src/routes/discover.routes.ts
// Discovery/recommendation routes wired to controller with validation.

import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { DiscoverQuerySchema, RecommendationFeedbackSchema } from "../schemas/index.js";
import { getRecommendationMetrics, getRecommendations, submitRecommendationFeedback } from "../controllers/discover.controller.js";

export const discoverRouter: ReturnType<typeof Router> = Router();

// GET /api/v1/discover — Get recommendations
discoverRouter.get("/", validate(DiscoverQuerySchema, "query"), getRecommendations);

// GET /api/v1/discover/metrics — Aggregated experiment metrics (NDCG/Precision)
discoverRouter.get("/metrics", getRecommendationMetrics);

// POST /api/v1/discover/feedback — mark recommendation as not relevant
discoverRouter.post("/feedback", validate(RecommendationFeedbackSchema), submitRecommendationFeedback);
