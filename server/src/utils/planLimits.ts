import { PlanTier, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "./ApiError";

// The tenant-side roles that count as "staff" for seat-cap and reporting
// purposes — everyone with a User record who isn't a STUDENT or PARENT.
export const STAFF_ROLES: UserRole[] = [
  "TEACHER",
  "LIBRARIAN",
  "ACCOUNTANT",
  "SCHOOL_ADMIN",
  "NURSE",
  "HR_MANAGER",
  "TRANSPORT_OFFICER",
  "HOSTEL_WARDEN",
];

// Mirrors the tiers on the marketing site's pricing section — student count
// is the primary axis, with staff seats scaling alongside it. SCHOOL_GROUP
// is not self-serve (see onboardSchoolSchema) — it's a custom-priced tier a
// platform admin applies manually after a "talk to us" conversation, so its
// caps are a generous placeholder rather than a real ceiling.
export const PLAN_DEFAULTS: Record<PlanTier, { maxStudents: number; maxStaff: number }> = {
  STARTER: { maxStudents: 150, maxStaff: 20 },
  GROWTH: { maxStudents: 400, maxStaff: 50 },
  PROFESSIONAL: { maxStudents: 800, maxStaff: 100 },
  ENTERPRISE: { maxStudents: 1500, maxStaff: 200 },
  SCHOOL_GROUP: { maxStudents: 100000, maxStaff: 10000 },
};

export async function assertStudentSlotAvailable(tenantId: string) {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const count = await prisma.student.count({ where: { tenantId } });
  if (count >= tenant.maxStudents) {
    throw ApiError.forbidden(
      `Student limit reached for the ${tenant.planTier} plan (${tenant.maxStudents}). Please upgrade your subscription.`
    );
  }
}

export async function assertStaffSlotAvailable(tenantId: string) {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const count = await prisma.user.count({ where: { tenantId, role: { in: STAFF_ROLES } } });
  if (count >= tenant.maxStaff) {
    throw ApiError.forbidden(
      `Staff limit reached for the ${tenant.planTier} plan (${tenant.maxStaff}). Please upgrade your subscription.`
    );
  }
}
