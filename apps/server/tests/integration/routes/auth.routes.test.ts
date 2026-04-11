import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { createApp } from "../../../src/app.js";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const app = createApp();

async function cleanDatabase() {
  await prisma.session.deleteMany();
  await prisma.recommendationEvent.deleteMany();
  await prisma.userRecommendationFeedback.deleteMany();
  await prisma.syncJob.deleteMany();
  await prisma.userGame.deleteMany();
  await prisma.game.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.user.deleteMany();
}

describe("Auth Routes Integration", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  it("POST /api/v1/auth/register should create account and start session", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      username: "phase18_user",
      email: "phase18_user@example.com",
      password: "TestPassword123",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("phase18_user@example.com");

    const setCookieHeader = res.headers["set-cookie"];
    expect(setCookieHeader).toBeDefined();
    expect(Array.isArray(setCookieHeader)).toBe(true);

    const created = await prisma.user.findUnique({
      where: { email: "phase18_user@example.com" },
    });

    expect(created).not.toBeNull();
    expect(created?.passwordHash).toBeTruthy();
    expect(created?.passwordHash).not.toBe("TestPassword123");
  });

  it("POST /api/v1/auth/login should authenticate and set session cookie", async () => {
    await request(app).post("/api/v1/auth/register").send({
      username: "phase18_login",
      email: "phase18_login@example.com",
      password: "TestPassword123",
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "phase18_login@example.com",
      password: "TestPassword123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe("phase18_login");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("GET /api/v1/platforms should deny access without authentication", async () => {
    const res = await request(app).get("/api/v1/platforms");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/v1/auth/logout should clear the session", async () => {
    const agent = request.agent(app);

    await agent.post("/api/v1/auth/register").send({
      username: "phase18_logout",
      email: "phase18_logout@example.com",
      password: "TestPassword123",
    });

    const logoutRes = await agent.post("/api/v1/auth/logout");
    expect(logoutRes.status).toBe(200);

    const meRes = await agent.get("/api/v1/auth/me");
    expect(meRes.status).toBe(401);
    expect(meRes.body.error.code).toBe("UNAUTHORIZED");
  });
});
