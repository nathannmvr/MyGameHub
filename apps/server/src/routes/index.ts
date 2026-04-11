// src/routes/index.ts
// Main API router — mounts all sub-routers under /api/v1

import { Router } from "express";
import { platformsRouter } from "./platforms.routes.js";
import { libraryRouter } from "./library.routes.js";
import { gamesRouter } from "./games.routes.js";
import { steamRouter } from "./steam.routes.js";
import { discoverRouter } from "./discover.routes.js";
import { dashboardRouter } from "./dashboard.routes.js";

export const apiRouter: ReturnType<typeof Router> = Router();

// ─── Mount Sub-Routers ───
apiRouter.use("/platforms", platformsRouter);
apiRouter.use("/library", libraryRouter);
apiRouter.use("/games", gamesRouter);
apiRouter.use("/steam", steamRouter);
apiRouter.use("/discover", discoverRouter);
apiRouter.use("/dashboard", dashboardRouter);
