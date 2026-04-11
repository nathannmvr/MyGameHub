// tests/unit/services/steam-categorizer.test.ts
// TDD RED -> GREEN: Steam sync categorization using recency + playtime.

import { describe, it, expect } from "vitest";
import { categorizeSteamStatus } from "../../../src/jobs/steam-sync.worker.js";

describe("categorizeSteamStatus", () => {
  it("should return PLAYING when last played is within 3 months regardless of hours", () => {
    const now = new Date("2026-04-11T00:00:00.000Z");
    const lastPlayedAt = new Date("2026-03-01T00:00:00.000Z");

    expect(categorizeSteamStatus(10, lastPlayedAt, now)).toBe("PLAYING");
    expect(categorizeSteamStatus(6000, lastPlayedAt, now)).toBe("PLAYING");
  });

  it("should return PLAYED when last played is older than 3 months and playtime >= 4h", () => {
    const now = new Date("2026-04-11T00:00:00.000Z");
    const lastPlayedAt = new Date("2025-12-01T00:00:00.000Z");

    expect(categorizeSteamStatus(240, lastPlayedAt, now)).toBe("PLAYED");
    expect(categorizeSteamStatus(5000, lastPlayedAt, now)).toBe("PLAYED");
  });

  it("should return DROPPED when last played is older than 3 months and playtime < 4h", () => {
    const now = new Date("2026-04-11T00:00:00.000Z");
    const lastPlayedAt = new Date("2025-12-01T00:00:00.000Z");

    expect(categorizeSteamStatus(0, lastPlayedAt, now)).toBe("DROPPED");
    expect(categorizeSteamStatus(239, lastPlayedAt, now)).toBe("DROPPED");
  });

  it("should keep fallback behavior when last played is unavailable", () => {
    expect(categorizeSteamStatus(0, null)).toBe("BACKLOG");
    expect(categorizeSteamStatus(60, null)).toBe("PLAYING");
    expect(categorizeSteamStatus(180, null)).toBe("PLAYED");
  });
});
