import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

// The Founding Schools Programme (see the marketing pricing page) locks in
// discounted Year-1 pricing for the first 1,000 schools that register.
// Every tenant counts toward the cohort, regardless of plan — there's no
// separate "founding" flag on Tenant, the cohort is simply "registered so
// far" against this fixed size.
export const FOUNDING_SCHOOLS_COHORT_SIZE = 1000;

export async function getSignupStats() {
  const schoolsRegistered = await prisma.tenant.count();
  return {
    schoolsRegistered,
    foundingCohortSize: FOUNDING_SCHOOLS_COHORT_SIZE,
    foundingSpotsRemaining: Math.max(FOUNDING_SCHOOLS_COHORT_SIZE - schoolsRegistered, 0),
  };
}

/**
 * Landing-page visitor beacon (see LandingPage.tsx) — anonymous engagement,
 * no login exists yet at this point. Upserts the same activity_daily_usage
 * row shape middleware/activityUsage.ts writes for authenticated actors
 * (actorType "visitor" here), which modules/monitor/activity.service.ts
 * already pushes to the backoffice Activity page every 5 minutes.
 */
export async function recordLandingView(visitorId: string, phase: "enter" | "leave") {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);

  const update: Prisma.ActivityDailyUsageUpdateInput = { lastSeenAt: now };
  if (phase === "enter") {
    update.requestCount = { increment: 1 };
  }

  await prisma.activityDailyUsage.upsert({
    where: { actorType_actorId_day: { actorType: "visitor", actorId: visitorId, day } },
    create: {
      actorType: "visitor",
      actorId: visitorId,
      day,
      firstSeenAt: now,
      lastSeenAt: now,
      requestCount: phase === "enter" ? 1 : 0,
    },
    update,
  });
}
