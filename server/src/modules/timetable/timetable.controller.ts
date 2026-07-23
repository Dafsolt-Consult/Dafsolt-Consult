import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { resolveStudentParam } from "../../utils/resolveStudentId";
import { ApiError } from "../../utils/ApiError";
import { createPeriodSchema, updatePeriodSchema } from "./timetable.schema";

const periodInclude = {
  subject: true,
  classArm: { include: { classLevel: true } },
  teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
} as const;

async function assertNoConflict(params: {
  tenantId: string;
  termId: string;
  classArmId: string;
  teacherId?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  excludeId?: string;
}) {
  const overlapWhere = {
    termId: params.termId,
    dayOfWeek: params.dayOfWeek,
    startTime: { lt: params.endTime },
    endTime: { gt: params.startTime },
    id: params.excludeId ? { not: params.excludeId } : undefined,
  };

  const classConflict = await prisma.timetablePeriod.findFirst({
    where: { tenantId: params.tenantId, classArmId: params.classArmId, ...overlapWhere },
  });
  if (classConflict) throw ApiError.conflict("This class already has a period scheduled at an overlapping time");

  if (params.teacherId) {
    const teacherConflict = await prisma.timetablePeriod.findFirst({
      where: { tenantId: params.tenantId, teacherId: params.teacherId, ...overlapWhere },
    });
    if (teacherConflict) throw ApiError.conflict("This teacher already has another class at an overlapping time");
  }
}

export const listPeriods = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { classArmId, termId } = req.query as Record<string, string | undefined>;

  const periods = await prisma.timetablePeriod.findMany({
    where: { tenantId, classArmId, termId },
    include: periodInclude,
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  res.json(periods);
});

export const createPeriod = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createPeriodSchema.parse(req.body);

  await assertNoConflict({ tenantId, ...input });

  const period = await prisma.timetablePeriod.create({ data: { ...input, tenantId }, include: periodInclude });
  res.status(201).json(period);
});

export const updatePeriod = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updatePeriodSchema.parse(req.body);

  const existing = await prisma.timetablePeriod.findFirst({ where: { id: req.params.periodId, tenantId } });
  if (!existing) throw ApiError.notFound("Timetable period not found");

  const merged = { ...existing, ...input };
  if (merged.startTime >= merged.endTime) {
    throw ApiError.badRequest("End time must be after start time");
  }

  await assertNoConflict({
    tenantId,
    termId: merged.termId,
    classArmId: merged.classArmId,
    teacherId: merged.teacherId,
    dayOfWeek: merged.dayOfWeek,
    startTime: merged.startTime,
    endTime: merged.endTime,
    excludeId: existing.id,
  });

  const period = await prisma.timetablePeriod.update({ where: { id: existing.id }, data: input, include: periodInclude });
  res.json(period);
});

export const deletePeriod = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.timetablePeriod.findFirst({ where: { id: req.params.periodId, tenantId } });
  if (!existing) throw ApiError.notFound("Timetable period not found");

  await prisma.timetablePeriod.delete({ where: { id: existing.id } });
  res.status(204).send();
});

export const listForTeacher = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const { termId } = req.query as Record<string, string | undefined>;

  let teacherId = req.params.teacherId;
  if (teacherId === "me") {
    const teacher = await prisma.teacher.findFirst({ where: { userId: req.auth.userId, tenantId } });
    if (!teacher) throw ApiError.forbidden("This account is not linked to a teacher profile");
    teacherId = teacher.id;
  } else if (req.auth.role === "TEACHER") {
    const teacher = await prisma.teacher.findFirst({ where: { userId: req.auth.userId, tenantId } });
    if (!teacher || teacher.id !== teacherId) throw ApiError.forbidden("You can only view your own timetable");
  }

  const periods = await prisma.timetablePeriod.findMany({
    where: { tenantId, teacherId, termId },
    include: periodInclude,
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  res.json(periods);
});

export const listForStudent = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const studentId = await resolveStudentParam(req, tenantId, req.params.studentId);
  const { termId } = req.query as Record<string, string | undefined>;

  const enrollment = await prisma.enrollment.findFirst({ where: { studentId }, orderBy: { enrolledAt: "desc" } });
  if (!enrollment) return res.json([]);

  const periods = await prisma.timetablePeriod.findMany({
    where: { tenantId, classArmId: enrollment.classArmId, termId },
    include: periodInclude,
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  res.json(periods);
});
