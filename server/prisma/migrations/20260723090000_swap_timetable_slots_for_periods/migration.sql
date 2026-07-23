-- Replaces the ad-hoc timetable_slots table (added 2026-07-20, never
-- populated — 0 rows in production) with the more complete timetable
-- model from the parallel v1.2 branch: nullable teacherId, integer
-- dayOfWeek instead of an enum, no overly-strict unique constraint.

-- DropForeignKey
ALTER TABLE "timetable_slots" DROP CONSTRAINT "timetable_slots_classArmId_fkey";

-- DropForeignKey
ALTER TABLE "timetable_slots" DROP CONSTRAINT "timetable_slots_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "timetable_slots" DROP CONSTRAINT "timetable_slots_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "timetable_slots" DROP CONSTRAINT "timetable_slots_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "timetable_slots" DROP CONSTRAINT "timetable_slots_termId_fkey";

-- DropTable
DROP TABLE "timetable_slots";

-- DropEnum
DROP TYPE "DayOfWeek";

-- CreateTable
CREATE TABLE "timetable_periods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "termId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "timetable_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timetable_periods_tenantId_classArmId_termId_dayOfWeek_idx" ON "timetable_periods"("tenantId", "classArmId", "termId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "timetable_periods_teacherId_termId_dayOfWeek_idx" ON "timetable_periods"("teacherId", "termId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
