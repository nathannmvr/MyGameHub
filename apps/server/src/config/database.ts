// src/config/database.ts
// Prisma Client singleton with pg adapter (Prisma 7)
// Provides a reusable database connection across the application

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

let prismaInstance: PrismaClient | null = null;

/**
 * Creates or returns the singleton PrismaClient instance.
 * Uses the pg driver adapter as required by Prisma 7.
 */
export function getPrismaClient(databaseUrl?: string): PrismaClient {
  if (prismaInstance) return prismaInstance;

  const url = databaseUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set in environment variables");
  }

  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);

  prismaInstance = new PrismaClient({ adapter });
  return prismaInstance;
}

/**
 * Creates a fresh PrismaClient (not singleton) — useful for tests
 */
export function createPrismaClient(databaseUrl?: string): PrismaClient {
  const url = databaseUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set in environment variables");
  }

  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}
