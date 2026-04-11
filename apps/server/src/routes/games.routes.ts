// src/routes/games.routes.ts
// Game search routes (RAWG) wired to controller with Zod validation.

import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { GameSearchQuerySchema } from "../schemas/index.js";
import { getGameDetails, searchGames } from "../controllers/games.controller.js";

export const gamesRouter: ReturnType<typeof Router> = Router();

// GET /api/v1/games/search?q= — Search games via RAWG
gamesRouter.get("/search", validate(GameSearchQuerySchema, "query"), searchGames);

// GET /api/v1/games/:rawgId — Game details from RAWG
gamesRouter.get("/:rawgId", getGameDetails);
