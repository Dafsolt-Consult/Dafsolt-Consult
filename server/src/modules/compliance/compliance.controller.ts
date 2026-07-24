import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";

function dateRange(req: Request) {
  const { from, to } = req.query as Record<string, string | undefined>;
  return {
    gte: from ? new Date(from) : undefined,
    lte: to ? new Date(to) : undefined,
  };
}

/** Per-student attendance rate over a date range, sorted worst-first.
 * Pass ?threshold=75 to only return students below that percentage. */
export const attendanceCompliance = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const threshold = req.query.threshold ? Number(req.query.threshold) : undefined;
  const range = dateRange(req);

  const grouped = await prisma.attendance.groupBy({
    by: ["studentId", "status"],
    where: { tenantId, date: range.gte || range.lte ? range : undefined },
    _count: true,
  });

  const byStudent = new Map<string, { total: number; present: number }>();
  for (const row of grouped) {
    const entry = byStudent.get(row.studentId) ?? { total: 0, present: 0 };
    entry.total += row._count;
    if (row.status === "PRESENT") entry.present += row._count;
    byStudent.set(row.studentId, entry);
  }

  const studentIds = [...byStudent.keys()];
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  const studentById = new Map(students.map((s) => [s.id, s]));

  let rows = studentIds.map((studentId) => {
    const { total, present } = byStudent.get(studentId)!;
    const rate = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;
    const student = studentById.get(studentId);
    return {
      studentId,
      studentName: student ? `${student.user.firstName} ${student.user.lastName}` : "Unknown",
      totalDays: total,
      presentDays: present,
      attendanceRate: rate,
    };
  });

  if (threshold !== undefined) rows = rows.filter((r) => r.attendanceRate < threshold);
  rows.sort((a, b) => a.attendanceRate - b.attendanceRate);

  res.json(rows);
});

/** Fee collection health for a term: totals plus the list of invoices still
 * outstanding, worst (largest balance) first. */
export const feeCompliance = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { termId } = req.query as Record<string, string | undefined>;

  const invoices = await prisma.invoice.findMany({
    where: { tenantId, termId },
    include: { student: { include: { user: { select: { firstName: true, lastName: true } } } }, feeStructure: true },
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const outstanding = invoices
    .filter((inv) => inv.status !== "PAID" && inv.status !== "CANCELED")
    .map((inv) => ({
      invoiceId: inv.id,
      studentName: `${inv.student.user.firstName} ${inv.student.user.lastName}`,
      feeStructureName: inv.feeStructure.name,
      balance: inv.amount - inv.amountPaid,
      status: inv.status,
      dueDate: inv.dueDate,
    }))
    .sort((a, b) => b.balance - a.balance);

  res.json({
    totalBilled,
    totalPaid,
    collectionRate: totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 1000) / 10 : 0,
    invoiceCount: invoices.length,
    outstanding,
  });
});

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { entityType, action, userId } = req.query as Record<string, string | undefined>;
  const range = dateRange(req);
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 50), 200);

  const where = {
    tenantId,
    entityType,
    action,
    userId,
    createdAt: range.gte || range.lte ? range : undefined,
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});

/** Data-hygiene checks: records missing information a school should keep
 * on file. Each list is capped for readability, not paginated. */
export const dataCompleteness = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);

  const [studentsWithoutGuardians, teachersWithoutQualification, classArmsWithoutFormTeacher] = await Promise.all([
    prisma.student.findMany({
      where: { tenantId, status: "ACTIVE", guardianLinks: { none: {} } },
      include: { user: { select: { firstName: true, lastName: true } } },
      take: 50,
    }),
    prisma.teacher.findMany({
      where: { tenantId, OR: [{ qualification: null }, { qualification: "" }] },
      include: { user: { select: { firstName: true, lastName: true } } },
      take: 50,
    }),
    prisma.classArm.findMany({
      where: { tenantId, formTeacherId: null },
      include: { classLevel: true },
      take: 50,
    }),
  ]);

  res.json({
    studentsWithoutGuardians: studentsWithoutGuardians.map((s) => ({
      id: s.id,
      name: `${s.user.firstName} ${s.user.lastName}`,
      admissionNumber: s.admissionNumber,
    })),
    teachersWithoutQualification: teachersWithoutQualification.map((t) => ({
      id: t.id,
      name: `${t.user.firstName} ${t.user.lastName}`,
      staffId: t.staffId,
    })),
    classArmsWithoutFormTeacher: classArmsWithoutFormTeacher.map((c) => ({
      id: c.id,
      name: `${c.classLevel.name} ${c.name}`,
    })),
  });
});
