// src/routes/steam.routes.ts
// Steam sync routes wired to controller with validation.

import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { rateLimiter } from "../middleware/rate-limiter.js";
import { SteamSyncSchema } from "../schemas/index.js";
import { getSteamSyncStatus, startSteamSync } from "../controllers/steam.controller.js";

export const steamRouter: ReturnType<typeof Router> = Router();

const syncRateLimiter = rateLimiter({
	windowMs: 60_000,
	maxRequests: 8,
	message: "Too many sync requests. Please wait before starting another sync.",
});

// POST /api/v1/steam/sync — Start Steam sync job
steamRouter.post("/sync", syncRateLimiter, validate(SteamSyncSchema), startSteamSync);

// GET /api/v1/steam/sync/:jobId — Poll sync job status
steamRouter.get("/sync/:jobId", getSteamSyncStatus);
