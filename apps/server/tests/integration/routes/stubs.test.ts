// tests/integration/routes/stubs.test.ts
// Integration tests verifying all route stubs return 501 Not Implemented
// These tests will evolve as routes are implemented in Phases 5-8

import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../../src/app.js";

const app = createApp();

describe("API Route Stubs — All return 501 Not Implemented", () => {
  // ─── Platforms ───
  describe("Platforms", () => {
    it("GET /api/v1/platforms → 501", async () => {
      const res = await request(app).get("/api/v1/platforms");
      expect(res.status).toBe(501);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });

    it("POST /api/v1/platforms → 501", async () => {
      const res = await request(app)
        .post("/api/v1/platforms")
        .send({ name: "Test", manufacturer: "Test" });
      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });

    it("PUT /api/v1/platforms/:id → 501", async () => {
      const res = await request(app)
        .put("/api/v1/platforms/some-id")
        .send({ name: "Updated" });
      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });

    it("DELETE /api/v1/platforms/:id → 501", async () => {
      const res = await request(app).delete("/api/v1/platforms/some-id");
      expect(res.status).toBe(501);
      expect(res.body.error.code).toBe("NOT_IMPLEMENTED");
    });
  });

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
