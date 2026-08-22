-- CreateTable
CREATE TABLE "activity_daily_usage" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorLabel" TEXT,
    "day" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "activity_daily_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_report_cursors" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "activity_report_cursors_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "activity_daily_usage_day_idx" ON "activity_daily_usage"("day");

-- CreateIndex
CREATE UNIQUE INDEX "activity_daily_usage_actorType_actorId_day_key" ON "activity_daily_usage"("actorType", "actorId", "day");
