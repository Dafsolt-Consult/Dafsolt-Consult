import { PlanTier } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "./ApiError";

export const PLAN_DEFAULTS: Record<PlanTier, { maxStudents: number; maxStaff: number }> = {
  FREE: { maxStudents: 100, maxStaff: 15 },
  BASIC: { maxStudents: 500, maxStaff: 50 },
  PREMIUM: { maxStudents: 5000, maxStaff: 500 },
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
  const count = await prisma.user.count({
    where: { tenantId, role: { in: ["TEACHER", "LIBRARIAN", "ACCOUNTANT", "SCHOOL_ADMIN"] } },
  });
  if (count >= tenant.maxStaff) {
    throw ApiError.forbidden(
      `Staff limit reached for the ${tenant.planTier} plan (${tenant.maxStaff}). Please upgrade your subscription.`
    );
  }
}
