// src/app.ts
// Express application factory — separated from server startup for testability
// The app is exported without calling listen(), enabling Supertest integration tests

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import { openApiDocument } from "./docs/openapi.js";
import { getEnv } from "./config/env.js";

function getAllowedOrigins(): string[] {
  const env = getEnv();
  const csv = env.CORS_ALLOWED_ORIGINS;

  if (!csv) {
    return [env.CORS_ORIGIN];
  }

  return csv
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createApp(): express.Express {
  const env = getEnv();
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.disable("x-powered-by");

  // ─── Global Middleware ───
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin not allowed by CORS policy"));
      },
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  // ─── Health Check (outside versioned API) ───
  app.get("/api/health", (_req, res) => {
    res.json({
      success: true,
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "0.0.0",
        environment: env.NODE_ENV,
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
