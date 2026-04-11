// src/routes/dashboard.routes.ts
// Dashboard stats routes — wired to controller
// Ref: design.md §4.2

import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";

export const dashboardRouter = Router();

// GET /api/v1/dashboard/stats — Dashboard statistics
dashboardRouter.get("/stats", getDashboardStats);

