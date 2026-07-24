import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { createLessonPlanSchema, updateLessonPlanSchema } from "./lesson-plans.schema";

const listInclude = {
  subject: true,
  classArm: { include: { classLevel: true } },
  term: true,
  teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
} as const;

export const listLessonPlans = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { classArmId, subjectId, termId, teacherId } = req.query as Record<string, string | undefined>;

  let scopedTeacherId = teacherId;
  if (req.auth?.role === "TEACHER") {
    const teacher = await prisma.teacher.findFirst({ where: { userId: req.auth.userId, tenantId } });
    if (!teacher) throw ApiError.forbidden("This account is not linked to a teacher profile");
    scopedTeacherId = teacher.id;
  }

  const lessonPlans = await prisma.lessonPlan.findMany({
    where: { tenantId, classArmId, subjectId, termId, teacherId: scopedTeacherId },
    include: listInclude,
    orderBy: { date: "desc" },
  });

  res.json(lessonPlans);
});

export const getLessonPlan = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const lessonPlan = await prisma.lessonPlan.findFirst({
    where: { id: req.params.lessonPlanId, tenantId },
    include: listInclude,
  });
  if (!lessonPlan) throw ApiError.notFound("Lesson plan not found");
  res.json(lessonPlan);
});

export const createLessonPlan = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createLessonPlanSchema.parse(req.body);

  let teacherId = input.teacherId;
  if (req.auth.role === "TEACHER") {
    const teacher = await prisma.teacher.findFirst({ where: { userId: req.auth.userId, tenantId } });
    if (!teacher) throw ApiError.forbidden("This account is not linked to a teacher profile");
    teacherId = teacher.id;
  }
  if (!teacherId) throw ApiError.badRequest("teacherId is required");

  const lessonPlan = await prisma.lessonPlan.create({
    data: { ...input, teacherId, tenantId },
    include: listInclude,
  });

  res.status(201).json(lessonPlan);
});

export const updateLessonPlan = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateLessonPlanSchema.parse(req.body);
  const existing = await prisma.lessonPlan.findFirst({ where: { id: req.params.lessonPlanId, tenantId } });
  if (!existing) throw ApiError.notFound("Lesson plan not found");

  const lessonPlan = await prisma.lessonPlan.update({
    where: { id: existing.id },
    data: input,
    include: listInclude,
  });
  res.json(lessonPlan);
});

export const deleteLessonPlan = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.lessonPlan.findFirst({ where: { id: req.params.lessonPlanId, tenantId } });
  if (!existing) throw ApiError.notFound("Lesson plan not found");

  await prisma.lessonPlan.delete({ where: { id: existing.id } });
  res.status(204).send();
});
