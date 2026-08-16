-- Rename the PlanTier enum from FREE/BASIC/PREMIUM to the five tiers used on
-- the marketing pricing page: STARTER/GROWTH/PROFESSIONAL/ENTERPRISE/
-- SCHOOL_GROUP. Existing tenants keep their current maxStudents/maxStaff
-- values untouched — only the plan LABEL is remapped, so no live tenant's
-- seat capacity silently changes. New tenants get the new tier's defaults
-- via PLAN_DEFAULTS in application code (server/src/utils/planLimits.ts) at
-- creation time, not via the column default.

CREATE TYPE "PlanTier_new" AS ENUM ('STARTER', 'GROWTH', 'PROFESSIONAL', 'ENTERPRISE', 'SCHOOL_GROUP');

ALTER TABLE "tenants" ALTER COLUMN "planTier" DROP DEFAULT;

ALTER TABLE "tenants"
  ALTER COLUMN "planTier" TYPE "PlanTier_new"
  USING (
    CASE "planTier"::text
      WHEN 'FREE' THEN 'STARTER'
      WHEN 'BASIC' THEN 'GROWTH'
      WHEN 'PREMIUM' THEN 'ENTERPRISE'
    END
  )::"PlanTier_new";

DROP TYPE "PlanTier";
ALTER TYPE "PlanTier_new" RENAME TO "PlanTier";

ALTER TABLE "tenants" ALTER COLUMN "planTier" SET DEFAULT 'STARTER';
ALTER TABLE "tenants" ALTER COLUMN "maxStudents" SET DEFAULT 150;
ALTER TABLE "tenants" ALTER COLUMN "maxStaff" SET DEFAULT 20;
