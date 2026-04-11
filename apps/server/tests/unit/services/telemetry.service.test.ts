// apps/server/tests/unit/services/telemetry.service.test.ts
// TDD tests for TelemetryService
// Ref: spec.md RN-16, design.md §6.3

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { TelemetryService } from "../../../src/services/telemetry.service";

// Mock Prisma Client
const createMockPrisma = (): Partial<PrismaClient> => {
  return {
    recommendationEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  };
};

describe("TelemetryService", () => {
  let mockPrisma: Partial<PrismaClient>;
  let telemetryService: TelemetryService;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    telemetryService = new TelemetryService(mockPrisma as PrismaClient);
  });

  describe("logEvent", () => {
    it("should log a recommendation event", async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: "evt1" });
      if (mockPrisma.recommendationEvent) {
        mockPrisma.recommendationEvent.create = mockCreate;
      }

      await telemetryService.logEvent(
        "user123",
        1,
        "IMPRESSION" as any,
        "control"
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user123",
          rawgId: 1,
          eventType: "IMPRESSION",
          experimentGroup: "control",
        },
      });
    });

    it("should allow optional experimentGroup", async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: "evt1" });
      if (mockPrisma.recommendationEvent) {
        mockPrisma.recommendationEvent.create = mockCreate;
      }

      await telemetryService.logEvent("user123", 1, "IMPRESSION" as any);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user123",
          rawgId: 1,
          eventType: "IMPRESSION",
          experimentGroup: undefined,
        },
      });
    });
  });

  describe("computeNDCGAtK", () => {
    it("should return null if no impressions found", async () => {
      if (mockPrisma.recommendationEvent) {
        mockPrisma.recommendationEvent.findMany = vi
          .fn()
          .mockResolvedValue([]);
      }

      const ndcg = await telemetryService.computeNDCGAtK(
        "user123",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
        10
      );

      expect(ndcg).toBeNull();
    });

    it("should compute NDCG@10 based on relevance pattern", async () => {
      // Mock impressions
      const impressions = [
        {
          rawgId: 1,
          createdAt: new Date("2025-01-15T10:00:00"),
        },
        {
          rawgId: 2,
          createdAt: new Date("2025-01-15T10:01:00"),
        },
      ];

      // Mock positive interactions (only for game 1)
      if (mockPrisma.recommendationEvent) {
        let callCount = 0;
        mockPrisma.recommendationEvent.findMany = vi.fn((args: any) => {
          if (args.distinct === "userId") {
            return Promise.resolve([{ userId: "user123" }]);
          }
          // Return impressions on first call (eventType: IMPRESSION)
          if (args.where?.eventType?.in === undefined) {
            return Promise.resolve(impressions);
          }
          return Promise.resolve([]);
        });

        mockPrisma.recommendationEvent.findFirst = vi
          .fn()
          .mockImplementation((args: any) => {
            // Only game 1 has a positive interaction
            if (args.where?.rawgId === 1) {
              return Promise.resolve({ id: "evt1" });
            }
            return Promise.resolve(null);
          });
      }

      const ndcg = await telemetryService.computeNDCGAtK(
        "user123",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
        10
      );

      expect(typeof ndcg).toBe("number");
      expect(ndcg).toBeGreaterThanOrEqual(0);
      expect(ndcg).toBeLessThanOrEqual(1); // NDCG is normalized 0-1
    });

    it("should return 0 NDCG if no relevant interactions", async () => {
      const impressions = [
        { rawgId: 1, createdAt: new Date("2025-01-15T10:00:00") },
      ];

      if (mockPrisma.recommendationEvent) {
        mockPrisma.recommendationEvent.findMany = vi
          .fn()
          .mockResolvedValue(impressions);
        mockPrisma.recommendationEvent.findFirst = vi
          .fn()
          .mockResolvedValue(null); // No positive interactions
      }

      const ndcg = await telemetryService.computeNDCGAtK(
        "user123",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
        10
      );

      expect(ndcg).toBe(0);
    });
  });

  describe("computePrecisionAtK", () => {
    it("should return null if no impressions found", async () => {
      if (mockPrisma.recommendationEvent) {
        mockPrisma.recommendationEvent.findMany = vi
          .fn()
          .mockResolvedValue([]);
      }

      const precision = await telemetryService.computePrecisionAtK(
        "user123",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
        10
      );

      expect(precision).toBeNull();
    });

    it("should compute Precision@K", async () => {
      const impressions = [
        {
          rawgId: 1,
          createdAt: new Date("2025-01-15T10:00:00"),
        },
        {
          rawgId: 2,
          createdAt: new Date("2025-01-15T10:01:00"),
        },
        {
          rawgId: 3,
          createdAt: new Date("2025-01-15T10:02:00"),
        },
      ];

      if (mockPrisma.recommendationEvent) {
        mockPrisma.recommendationEvent.findMany = vi
          .fn()
          .mockResolvedValue(impressions);

        // 2 out of 3 have positive interactions
        mockPrisma.recommendationEvent.findFirst = vi
          .fn()
          .mockImplementation((args: any) => {
            if (args.where?.rawgId === 1 || args.where?.rawgId === 2) {
              return Promise.resolve({ id: "evt1" });
            }
            return Promise.resolve(null);
          });
      }

      const precision = await telemetryService.computePrecisionAtK(
        "user123",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
        10
      );

      expect(precision).toBeCloseTo(2 / 3, 2); // 2 positive out of 3
    });
  });

  describe("computeMetricsForExperiment", () => {
    it("should batch compute metrics for multiple users", async () => {
      const usersWithEvents = [{ userId: "user1" }, { userId: "user2" }];

      if (mockPrisma.recommendationEvent) {
        mockPrisma.recommendationEvent.findMany = vi
          .fn()
          .mockResolvedValue(usersWithEvents);
      }

      // This test verifies integration but would need more detailed mocking
      // In real tests, you'd mock the underlying computeNDCGAtK and computePrecisionAtK

      const result = await telemetryService.computeMetricsForExperiment(
        new Date("2025-01-01"),
        new Date("2025-01-31")
      );

      expect(result).toHaveProperty("avgNDCG");
      expect(result).toHaveProperty("avgPrecision");
      expect(result).toHaveProperty("userCount");
      expect(result).toHaveProperty("sampleSize");
    });
  });
});
