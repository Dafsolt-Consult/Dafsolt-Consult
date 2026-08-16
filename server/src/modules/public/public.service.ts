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
