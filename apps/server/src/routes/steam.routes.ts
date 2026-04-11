// src/routes/steam.routes.ts
// Steam sync routes wired to controller with validation.

import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { SteamSyncSchema } from "../schemas/index.js";
import { getSteamSyncStatus, startSteamSync } from "../controllers/steam.controller.js";

export const steamRouter = Router();

// POST /api/v1/steam/sync — Start Steam sync job
steamRouter.post("/sync", validate(SteamSyncSchema), startSteamSync);

// GET /api/v1/steam/sync/:jobId — Poll sync job status
steamRouter.get("/sync/:jobId", getSteamSyncStatus);
