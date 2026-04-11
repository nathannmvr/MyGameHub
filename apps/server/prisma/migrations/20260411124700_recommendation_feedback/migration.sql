-- CreateTable
CREATE TABLE "user_recommendation_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rawg_id" INTEGER NOT NULL,
    "title" TEXT,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_recommendation_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_recommendation_feedback_user_id_rawg_id_key" ON "user_recommendation_feedback"("user_id", "rawg_id");

-- CreateIndex
CREATE INDEX "user_recommendation_feedback_user_id_created_at_idx" ON "user_recommendation_feedback"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_recommendation_feedback" ADD CONSTRAINT "user_recommendation_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
