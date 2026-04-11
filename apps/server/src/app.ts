// src/app.ts
// Express application factory — separated from server startup for testability
// The app is exported without calling listen(), enabling Supertest integration tests

import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import { openApiDocument } from "./docs/openapi.js";

export function createApp() {
  const app = express();

  // ─── Global Middleware ───
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    })
  );
  app.use(express.json());

  // ─── Health Check (outside versioned API) ───
  app.get("/api/health", (_req, res) => {
    res.json({
      success: true,
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "0.0.0",
      },
    });
  });

  // OpenAPI document and Swagger UI
  app.get("/api/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  // ─── API v1 Routes ───
  app.use("/api/v1", apiRouter);

  // ─── Error Handler (must be last) ───
  app.use(errorHandler);

  return app;
}
