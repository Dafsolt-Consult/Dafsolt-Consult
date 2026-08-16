import { prisma } from "../../config/prisma";
import { STAFF_ROLES } from "../../utils/planLimits";

// Founding Schools Programme term price per tier — mirrors the marketing
// pricing page (client/src/pages/LandingPage.tsx PLANS). This is an
// estimate for internal visibility only, not real billing: Paystack/
// Flutterwave are still stubs, so nothing here is actually collected yet.
// SCHOOL_GROUP is custom-priced and excluded from the estimate.
const FOUNDING_TERM_PRICE: Partial<Record<string, number>> = {
  STARTER: 50000,
  GROWTH: 100000,
  PROFESSIONAL: 175000,
  ENTERPRISE: 280000,
};

/** Tenant signups bucketed by month, oldest first, for the last 12 months —
 * shows whether the platform is actually gaining schools over time. */
async function signupTrend() {
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const tenants = await prisma.tenant.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const byMonth = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(since);
    d.setMonth(d.getMonth() + i);
    byMonth.set(d.toISOString().slice(0, 7), 0);
  }
  for (const t of tenants) {
    const key = t.createdAt.toISOString().slice(0, 7);
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }

  return [...byMonth.entries()].map(([month, count]) => ({ month, count }));
}

async function planDistribution() {
  const rows = await prisma.tenant.groupBy({ by: ["planTier"], _count: { _all: true } });
  return rows.map((r) => ({ planTier: r.planTier, count: r._count._all }));
}

async function subscriptionStatusDistribution() {
  const rows = await prisma.tenant.groupBy({ by: ["subscriptionStatus"], _count: { _all: true } });
  return rows.map((r) => ({ status: r.subscriptionStatus, count: r._count._all }));
}

async function totals() {
  const [schools, students, staff] = await Promise.all([
    prisma.tenant.count(),
    prisma.student.count(),
    prisma.user.count({ where: { role: { in: [...STAFF_ROLES] } } }),
  ]);
  return { schools, students, staff };
}

async function estimatedRevenuePerTerm() {
  const rows = await prisma.tenant.groupBy({ by: ["planTier"], _count: { _all: true } });
  let total = 0;
  let unpriced = 0;
  for (const r of rows) {
    const price = FOUNDING_TERM_PRICE[r.planTier];
    if (price === undefined) {
      unpriced += r._count._all;
      continue;
    }
    total += price * r._count._all;
  }
  return { totalKobo: total * 100, schoolsIncluded: rows.reduce((s, r) => s + r._count._all, 0) - unpriced, schoolsExcluded: unpriced };
}

/** Trials expiring within the next 7 days that haven't converted yet — the
 * platform team's actionable follow-up list. */
async function trialsEndingSoon() {
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return prisma.tenant.findMany({
    where: { subscriptionStatus: "TRIALING", trialEndsAt: { gte: now, lte: soon } },
    orderBy: { trialEndsAt: "asc" },
    select: { id: true, name: true, slug: true, planTier: true, trialEndsAt: true, _count: { select: { students: true, users: true } } },
  });
}

export async function getOverview() {
  const [trend, plans, statuses, totalCounts, revenue, expiring] = await Promise.all([
    signupTrend(),
    planDistribution(),
    subscriptionStatusDistribution(),
    totals(),
    estimatedRevenuePerTerm(),
    trialsEndingSoon(),
  ]);

  return {
    signupTrend: trend,
    planDistribution: plans,
    subscriptionStatusDistribution: statuses,
    totals: totalCounts,
    estimatedRevenuePerTerm: revenue,
    trialsEndingSoon: expiring,
  };
}
