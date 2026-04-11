// apps/server/src/services/telemetry.service.ts
// Telemetry event logging and offline metrics computation
// Ref: spec.md RN-16, design.md §6.3

import type { PrismaClient } from "@prisma/client";

export class TelemetryService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log a recommendation event for later analysis
   */
  async logEvent(
    userId: string,
    rawgId: number,
    eventType: "IMPRESSION" | "OPEN_DETAILS" | "ADD_TO_LIBRARY" | "DISMISS" | "HIDE",
    experimentGroup?: string
  ): Promise<void> {
    await this.prisma.recommendationEvent.create({
      data: {
        userId,
        rawgId,
        eventType,
        experimentGroup,
      },
    });
  }

  /**
   * Calculate DCG (Discounted Cumulative Gain) for a list of games
   * DCG = Σ(relevance_i / log2(i+1)) for i=1..K
   *
   * Relevance = 1 if user clicked "add_to_library" or "open_details", 0 otherwise
   */
  private calculateDCG(relevances: number[], k: number = 10): number {
    let dcg = 0;
    for (let i = 0; i < Math.min(k, relevances.length); i++) {
      dcg += relevances[i] / Math.log2(i + 2); // log2(i+2) because positions are 1-indexed
    }
    return dcg;
  }

  /**
   * Calculate ideal DCG (maximum possible DCG with all 1s)
   */
  private calculateIDCG(numRelevant: number, k: number = 10): number {
    let idcg = 0;
    for (let i = 0; i < Math.min(k, numRelevant); i++) {
      idcg += 1 / Math.log2(i + 2);
    }
    return idcg;
  }

  /**
   * Compute NDCG@K: Normalized DCG
   * NDCG@K = DCG@K / iDCG@K
   *
   * Requires events for a user session (impression → add_to_library/dismiss pattern)
   */
  async computeNDCGAtK(
    userId: string,
    startDate: Date,
    endDate: Date,
    k: number = 10,
    experimentGroup?: string
  ): Promise<number | null> {
    // Get all impressions in the period
    const impressions = await this.prisma.recommendationEvent.findMany({
      where: {
        userId,
        eventType: "IMPRESSION",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(experimentGroup && { experimentGroup }),
      },
      orderBy: { createdAt: "asc" },
      take: k,
    });

    if (impressions.length === 0) {
      return null;
    }

    // For each impression, check if there was a positive interaction (ADD_TO_LIBRARY or OPEN_DETAILS)
    const relevances: number[] = [];
    for (const impression of impressions) {
      const hasPositiveInteraction = await this.prisma.recommendationEvent.findFirst({
        where: {
          userId,
          rawgId: impression.rawgId,
          eventType: { in: ["ADD_TO_LIBRARY", "OPEN_DETAILS"] },
          createdAt: {
            gt: impression.createdAt,
            lt: new Date(impression.createdAt.getTime() + 24 * 60 * 60 * 1000), // Within 24h of impression
          },
        },
      });

      relevances.push(hasPositiveInteraction ? 1 : 0);
    }

    // Count total relevant items (positive interactions)
    const totalRelevant = relevances.filter((r) => r === 1).length;

    // Calculate DCG and iDCG
    const dcg = this.calculateDCG(relevances, k);
    const idcg = this.calculateIDCG(totalRelevant, k);

    if (idcg === 0) {
      return 0; // No relevant items
    }

    return dcg / idcg;
  }

  /**
   * Calculate Precision@K: fraction of recommended games that user liked
   * Precision@K = (# of relevant items in top-K) / K
   */
  async computePrecisionAtK(
    userId: string,
    startDate: Date,
    endDate: Date,
    k: number = 10,
    experimentGroup?: string
  ): Promise<number | null> {
    // Get all impressions in the period
    const impressions = await this.prisma.recommendationEvent.findMany({
      where: {
        userId,
        eventType: "IMPRESSION",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(experimentGroup && { experimentGroup }),
      },
      orderBy: { createdAt: "asc" },
      take: k,
    });

    if (impressions.length === 0) {
      return null;
    }

    // Count positive interactions
    let positiveCount = 0;
    for (const impression of impressions) {
      const hasPositiveInteraction = await this.prisma.recommendationEvent.findFirst({
        where: {
          userId,
          rawgId: impression.rawgId,
          eventType: { in: ["ADD_TO_LIBRARY", "OPEN_DETAILS"] },
          createdAt: {
            gt: impression.createdAt,
            lt: new Date(impression.createdAt.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (hasPositiveInteraction) {
        positiveCount++;
      }
    }

    return positiveCount / impressions.length;
  }

  /**
   * Batch compute metrics for all users
   */
  async computeMetricsForExperiment(
    startDate: Date,
    endDate: Date,
    experimentGroup?: string,
    k: number = 10
  ): Promise<{
    avgNDCG: number;
    avgPrecision: number;
    userCount: number;
    sampleSize: number;
  }> {
    // Get all unique users with events in the period
    const usersWithEvents = await this.prisma.recommendationEvent.findMany({
      distinct: ["userId"],
      where: {
        eventType: "IMPRESSION",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(experimentGroup && { experimentGroup }),
      },
      select: { userId: true },
    });

    let totalNDCG = 0;
    let totalPrecision = 0;
    let sampleSize = 0;

    for (const { userId } of usersWithEvents) {
      const ndcg = await this.computeNDCGAtK(
        userId,
        startDate,
        endDate,
        k,
        experimentGroup
      );
      const precision = await this.computePrecisionAtK(
        userId,
        startDate,
        endDate,
        k,
        experimentGroup
      );

      if (ndcg !== null && precision !== null) {
        totalNDCG += ndcg;
        totalPrecision += precision;
        sampleSize++;
      }
    }

    return {
      avgNDCG: sampleSize > 0 ? totalNDCG / sampleSize : 0,
      avgPrecision: sampleSize > 0 ? totalPrecision / sampleSize : 0,
      userCount: usersWithEvents.length,
      sampleSize,
    };
  }
}
