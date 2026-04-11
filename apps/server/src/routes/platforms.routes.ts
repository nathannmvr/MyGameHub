// src/routes/platforms.routes.ts
// Platform CRUD routes — wired to controller with Zod validation
// Ref: design.md §4.2, spec.md §3.1

import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  CreatePlatformSchema,
  UpdatePlatformSchema,
} from "../schemas/index.js";
import {
  listPlatforms,
  createPlatform,
  updatePlatform,
  deletePlatform,
} from "../controllers/platforms.controller.js";

export const platformsRouter = Router();

// GET /api/v1/platforms — List user's platforms
platformsRouter.get("/", listPlatforms);

// POST /api/v1/platforms — Create platform (with validation)
platformsRouter.post("/", validate(CreatePlatformSchema), createPlatform);

// PUT /api/v1/platforms/:id — Update platform (with validation)
platformsRouter.put("/:id", validate(UpdatePlatformSchema), updatePlatform);

// DELETE /api/v1/platforms/:id — Delete platform
platformsRouter.delete("/:id", deletePlatform);
