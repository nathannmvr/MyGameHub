// tests/integration/routes/stubs.test.ts
// Integration tests verifying remaining route stubs return 501 Not Implemented
// Routes that have been implemented have their own dedicated test files:
// - Platforms: platforms.routes.test.ts ✅

import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../../src/app.js";

const app = createApp();

describe("API Route Stubs — Remaining 501 Not Implemented", () => {

  // ─── Library ───
  describe("Library", () => {
    it("GET /api/v1/library → 501", async () => {
      const res = await request(app).get("/api/v1/library");
      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });

    it("POST /api/v1/library → 501", async () => {
      const res = await request(app)
        .post("/api/v1/library")
        .send({ rawgId: 123, platformId: "abc", status: "BACKLOG" });
      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });

    it("PUT /api/v1/library/:id → 501", async () => {
      const res = await request(app)
        .put("/api/v1/library/some-id")
        .send({ status: "PLAYING" });
      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });

    it("DELETE /api/v1/library/:id → 501", async () => {
      const res = await request(app).delete("/api/v1/library/some-id");
      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });
  });

  // ─── Games (RAWG Search) ───
  describe("Games", () => {
    it("GET /api/v1/games/search?q=zelda → 501", async () => {
      const res = await request(app).get("/api/v1/games/search?q=zelda");
      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });

    it("GET /api/v1/games/:rawgId → 501", async () => {
      const res = await request(app).get("/api/v1/games/3498");
      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });
  });

  // ─── Steam ───
  describe("Steam", () => {
    it("POST /api/v1/steam/sync → 501", async () => {
      const res = await request(app)
        .post("/api/v1/steam/sync")
        .send({ steamId: "123", platformId: "abc" });
      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });

    it("GET /api/v1/steam/sync/:jobId → 501", async () => {
      const res = await request(app).get("/api/v1/steam/sync/job-123");
      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });
  });

  // ─── Discover ───
  describe("Discover", () => {
    it("GET /api/v1/discover → 501", async () => {
      const res = await request(app).get("/api/v1/discover");
      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });
  });

  // ─── Dashboard ───
  describe("Dashboard", () => {
    it("GET /api/v1/dashboard/stats → 501", async () => {
      const res = await request(app).get("/api/v1/dashboard/stats");
      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });
  });

  // ─── Health Check (should still work) ───
  describe("Health Check", () => {
    it("GET /api/health → 200", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ok");
    });
  });
});
