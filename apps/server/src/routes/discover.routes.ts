// src/routes/discover.routes.ts
// Discovery/recommendation routes wired to controller with validation.

import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { DiscoverQuerySchema } from "../schemas/index.js";
import { getRecommendations } from "../controllers/discover.controller.js";

export const discoverRouter: ReturnType<typeof Router> = Router();

// GET /api/v1/discover — Get recommendations
discoverRouter.get("/", validate(DiscoverQuerySchema, "query"), getRecommendations);
