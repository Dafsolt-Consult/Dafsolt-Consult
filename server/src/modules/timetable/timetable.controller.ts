import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { resolveStudentParam } from "../../utils/resolveStudentId";
import { createTimetableSlotSchema, updateTimetableSlotSchema } from "./timetable.schema";

const slotInclude = {
  subject: true,
  classArm: { include: { classLevel: true } },
  teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
} as const;

async function assertNoOverlap(params: {
  tenantId: string;
  termId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  classArmId: string;
  teacherId: string;
  excludeId?: string;
}) {
  const { tenantId, termId, dayOfWeek, startTime, endTime, classArmId, teacherId, excludeId } = params;

  const clashing = await prisma.timetableSlot.findMany({
    where: {
      tenantId,
      termId,
      dayOfWeek: dayOfWeek as never,
      id: excludeId ? { not: excludeId } : undefined,
      OR: [{ classArmId }, { teacherId }],
    },
  });

  const overlap = clashing.find((slot) => slot.startTime < endTime && slot.endTime > startTime);
  if (!overlap) return;

  if (overlap.classArmId === classArmId) {
    throw ApiError.conflict("This class already has a lesson scheduled at that time");
  }
  throw ApiError.conflict("This teacher is already scheduled elsewhere at that time");
}

export const listTimetableSlots = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { classArmId, termId, teacherId } = req.query as Record<string, string | undefined>;

  const slots = await prisma.timetableSlot.findMany({
    where: { tenantId, classArmId, termId, teacherId },
    include: slotInclude,
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  res.json(slots);
});

export const getStudentTimetable = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const studentId = await resolveStudentParam(req, tenantId, req.params.studentId);
  const { termId } = req.query as Record<string, string | undefined>;
  if (!termId) throw ApiError.badRequest("termId is required");

  const enrollment = await prisma.enrollment.findFirst({ where: { studentId }, orderBy: { enrolledAt: "desc" } });
  if (!enrollment) return res.json([]);

  const slots = await prisma.timetableSlot.findMany({
    where: { tenantId, termId, classArmId: enrollment.classArmId },
    include: slotInclude,
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  res.json(slots);
});

export const createTimetableSlot = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createTimetableSlotSchema.parse(req.body);

  await assertNoOverlap({ tenantId, ...input });

  const slot = await prisma.timetableSlot.create({
    data: { ...input, tenantId },
    include: slotInclude,
  });

  res.status(201).json(slot);
});

export const updateTimetableSlot = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateTimetableSlotSchema.parse(req.body);

  const existing = await prisma.timetableSlot.findFirst({ where: { id: req.params.slotId, tenantId } });
  if (!existing) throw ApiError.notFound("Timetable slot not found");

  await assertNoOverlap({
    tenantId,
    termId: existing.termId,
    dayOfWeek: input.dayOfWeek ?? existing.dayOfWeek,
    startTime: input.startTime ?? existing.startTime,
    endTime: input.endTime ?? existing.endTime,
    classArmId: existing.classArmId,
    teacherId: input.teacherId ?? existing.teacherId,
    excludeId: existing.id,
  });

  const slot = await prisma.timetableSlot.update({
    where: { id: existing.id },
    data: input,
    include: slotInclude,
  });
  res.json(slot);
});

export const deleteTimetableSlot = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.timetableSlot.findFirst({ where: { id: req.params.slotId, tenantId } });
  if (!existing) throw ApiError.notFound("Timetable slot not found");

  await prisma.timetableSlot.delete({ where: { id: existing.id } });
  res.status(204).send();
});
