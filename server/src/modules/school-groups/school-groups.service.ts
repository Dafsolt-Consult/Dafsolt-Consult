import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { enrollmentTrend, attendanceTrend, feeCollectionByTerm, examPerformance } from "../analytics/analytics.service";
import { STAFF_ROLES } from "../../utils/planLimits";
import { CreateSchoolGroupInput, UpdateSchoolGroupInput } from "./school-groups.schema";

const TENANT_SUMMARY_SELECT = {
  id: true,
  name: true,
  slug: true,
  planTier: true,
  subscriptionStatus: true,
  _count: { select: { students: true, users: { where: { role: { in: STAFF_ROLES } } } } },
} as const;

export async function listSchoolGroups() {
  return prisma.schoolGroup.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tenants: true } } },
  });
}

export async function createSchoolGroup(input: CreateSchoolGroupInput) {
  return prisma.schoolGroup.create({ data: { name: input.name } });
}

export async function updateSchoolGroup(groupId: string, input: UpdateSchoolGroupInput) {
  const group = await prisma.schoolGroup.findUnique({ where: { id: groupId } });
  if (!group) throw ApiError.notFound("School group not found");
  return prisma.schoolGroup.update({ where: { id: groupId }, data: { name: input.name } });
}

export async function getSchoolGroupById(groupId: string) {
  const group = await prisma.schoolGroup.findUnique({
    where: { id: groupId },
    include: { tenants: { select: TENANT_SUMMARY_SELECT, orderBy: { name: "asc" } } },
  });
  if (!group) throw ApiError.notFound("School group not found");
  return group;
}

export async function assignTenantToGroup(groupId: string, tenantId: string) {
  const group = await prisma.schoolGroup.findUnique({ where: { id: groupId } });
  if (!group) throw ApiError.notFound("School group not found");

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw ApiError.notFound("School not found");

  return prisma.tenant.update({ where: { id: tenantId }, data: { groupId } });
}

export async function removeTenantFromGroup(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw ApiError.notFound("School not found");
  return prisma.tenant.update({ where: { id: tenantId }, data: { groupId: null } });
}

/** Current-snapshot rollup across a group's tenants — not a merged
 * historical trend, since AcademicSession/Term ids aren't shared across
 * tenants and stitching those together cleanly is a much bigger problem
 * than the reporting value justifies here. */
export async function getGroupConsolidatedReport(groupId: string) {
  const group = await prisma.schoolGroup.findUnique({
    where: { id: groupId },
    include: { tenants: { select: { id: true, name: true } } },
  });
  if (!group) throw ApiError.notFound("School group not found");

  const campuses = await Promise.all(
    group.tenants.map(async (tenant) => {
      const [enrollment, attendance, feeCollection, exams] = await Promise.all([
        enrollmentTrend(tenant.id),
        attendanceTrend(tenant.id),
        feeCollectionByTerm(tenant.id),
        examPerformance(tenant.id),
      ]);

      const latestEnrollment = enrollment.at(-1)?.count ?? 0;
      const averageAttendanceRate = attendance.length
        ? Math.round((attendance.reduce((sum, d) => sum + d.rate, 0) / attendance.length) * 10) / 10
        : 0;
      const feeBilled = feeCollection.reduce((sum, t) => sum + t.billed, 0);
      const feePaid = feeCollection.reduce((sum, t) => sum + t.paid, 0);

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        latestEnrollment,
        averageAttendanceRate,
        feeBilled,
        feePaid,
        feeCollectionRate: feeBilled > 0 ? Math.round((feePaid / feeBilled) * 1000) / 10 : 0,
        examPerformance: exams,
      };
    })
  );

  const totalEnrollment = campuses.reduce((sum, c) => sum + c.latestEnrollment, 0);
  const totalFeeBilled = campuses.reduce((sum, c) => sum + c.feeBilled, 0);
  const totalFeePaid = campuses.reduce((sum, c) => sum + c.feePaid, 0);
  const averageAttendanceRate = campuses.length
    ? Math.round((campuses.reduce((sum, c) => sum + c.averageAttendanceRate, 0) / campuses.length) * 10) / 10
    : 0;

  return {
    group: { id: group.id, name: group.name },
    campuses,
    totals: {
      totalEnrollment,
      averageAttendanceRate,
      totalFeeBilled,
      totalFeePaid,
      feeCollectionRate: totalFeeBilled > 0 ? Math.round((totalFeePaid / totalFeeBilled) * 1000) / 10 : 0,
    },
  };
}
