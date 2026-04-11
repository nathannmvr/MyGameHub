-- CreateEnum
CREATE TYPE "RecommendationEventType" AS ENUM ('IMPRESSION', 'OPEN_DETAILS', 'ADD_TO_LIBRARY', 'DISMISS', 'HIDE');

-- CreateTable
CREATE TABLE "recommendation_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rawg_id" INTEGER NOT NULL,
    "eventType" "RecommendationEventType" NOT NULL,
    "experiment_group" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendation_events_user_id_created_at_idx" ON "recommendation_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "recommendation_events_experiment_group_created_at_idx" ON "recommendation_events"("experiment_group", "created_at");

-- AddForeignKey
ALTER TABLE "recommendation_events" ADD CONSTRAINT "recommendation_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
