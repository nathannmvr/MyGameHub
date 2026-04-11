// tests/integration/routes/stubs.test.ts
// Integration tests verifying remaining route stubs return 501 Not Implemented
// Routes that have been implemented have their own dedicated test files:
// - Platforms: platforms.routes.test.ts ✅
// - Library: library.routes.test.ts ✅
// - Dashboard: dashboard.routes.test.ts ✅

import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../../src/app.js";

const app = createApp();

describe("API Route Stubs — Remaining 501 Not Implemented", () => {
  // ─── Discover ───
  describe("Discover", () => {
    it("GET /api/v1/discover → 501", async () => {
      const res = await request(app).get("/api/v1/discover");
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
