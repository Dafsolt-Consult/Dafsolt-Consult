-- Adds two new PlatformRole values for the growing Dafsolt team: BILLING
-- (manage tenant subscriptions/plans, view revenue analytics) and
-- CONTENT_MANAGER (manage the shared exam-practice question library).
-- Purely additive — existing OWNER/SUPPORT admins and their assignments are
-- untouched, so unlike the PlanTier rename this needs no data remap.
ALTER TYPE "PlatformRole" ADD VALUE 'BILLING';
ALTER TYPE "PlatformRole" ADD VALUE 'CONTENT_MANAGER';
