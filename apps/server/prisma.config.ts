// prisma.config.ts
// Prisma 7 configuration — datasource URL and migration settings
// Ref: https://pris.ly/d/config-datasource

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: env("DATABASE_URL"),
  },
});
