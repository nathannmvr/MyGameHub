// tests/unit/services/steam-categorizer.test.ts
// TDD RED -> GREEN: Playtime based categorization for Steam import.

import { describe, it, expect } from "vitest";
import { categorizeByPlaytime } from "../../../src/jobs/steam-sync.worker.js";

describe("categorizeByPlaytime", () => {
  it("categorizeByPlaytime(0) should return BACKLOG", () => {
    expect(categorizeByPlaytime(0)).toBe("BACKLOG");
  });

  it("categorizeByPlaytime(60) should return PLAYING", () => {
    expect(categorizeByPlaytime(60)).toBe("PLAYING");
  });

  it("categorizeByPlaytime(179) should return PLAYING", () => {
    expect(categorizeByPlaytime(179)).toBe("PLAYING");
  });

  it("categorizeByPlaytime(180) should return PLAYED", () => {
    expect(categorizeByPlaytime(180)).toBe("PLAYED");
  });

  it("categorizeByPlaytime(5000) should return PLAYED", () => {
    expect(categorizeByPlaytime(5000)).toBe("PLAYED");
  });
});
