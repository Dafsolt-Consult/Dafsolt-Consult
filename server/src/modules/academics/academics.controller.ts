import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import {
  assignClassSubjectSchema,
  createClassArmSchema,
  createClassLevelSchema,
  createSessionSchema,
  createSubjectSchema,
  createTermSchema,
  updateClassArmSchema,
} from "./academics.schema";

// ── Academic sessions ──────────────────────────────────────────────────────

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const sessions = await prisma.academicSession.findMany({
    where: { tenantId },
    include: { terms: true },
    orderBy: { startDate: "desc" },
  });
  res.json(sessions);
});

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createSessionSchema.parse(req.body);

  const session = await prisma.$transaction(async (tx) => {
    if (input.isCurrent) {
      await tx.academicSession.updateMany({ where: { tenantId }, data: { isCurrent: false } });
    }
    return tx.academicSession.create({ data: { ...input, tenantId } });
  });

  res.status(201).json(session);
});

export const createTerm = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createTermSchema.parse(req.body);

  const term = await prisma.$transaction(async (tx) => {
    if (input.isCurrent) {
      await tx.term.updateMany({ where: { tenantId }, data: { isCurrent: false } });
    }
    return tx.term.create({ data: { ...input, tenantId } });
  });

  res.status(201).json(term);
});

// ── Class levels & arms ────────────────────────────────────────────────────

export const listClassLevels = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const levels = await prisma.classLevel.findMany({
    where: { tenantId },
    include: { classArms: true },
    orderBy: { order: "asc" },
  });
  res.json(levels);
});

export const createClassLevel = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createClassLevelSchema.parse(req.body);
  const level = await prisma.classLevel.create({ data: { ...input, tenantId } });
  res.status(201).json(level);
});

export const createClassArm = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createClassArmSchema.parse(req.body);
  const arm = await prisma.classArm.create({ data: { ...input, tenantId } });
  res.status(201).json(arm);
});

export const updateClassArm = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateClassArmSchema.parse(req.body);

  const existing = await prisma.classArm.findFirst({ where: { id: req.params.classArmId, tenantId } });
  if (!existing) throw ApiError.notFound("Class arm not found");

  if (input.formTeacherId) {
    const teacher = await prisma.teacher.findFirst({ where: { id: input.formTeacherId, tenantId } });
    if (!teacher) throw ApiError.notFound("Teacher not found");
  }

  const arm = await prisma.classArm.update({
    where: { id: req.params.classArmId },
    data: input,
    include: { classLevel: true, formTeacher: { include: { user: true } } },
  });
  res.json(arm);
});

export const listClassArms = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const arms = await prisma.classArm.findMany({
    where: { tenantId },
    include: { classLevel: true, formTeacher: { include: { user: true } }, _count: { select: { enrollments: true } } },
  });
  res.json(arms);
});

// ── Subjects ────────────────────────────────────────────────────────────────

export const listSubjects = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const subjects = await prisma.subject.findMany({
    where: { tenantId },
    include: { classLevels: true },
    orderBy: { name: "asc" },
  });
  res.json(subjects);
});

export const createSubject = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { classLevelIds, ...input } = createSubjectSchema.parse(req.body);
  const subject = await prisma.subject.create({
    data: {
      ...input,
      tenantId,
      classLevels: classLevelIds ? { connect: classLevelIds.map((id) => ({ id })) } : undefined,
    },
  });
  res.status(201).json(subject);
});

// ── Class ↔ subject ↔ teacher assignment ───────────────────────────────────

export const assignClassSubject = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = assignClassSubjectSchema.parse(req.body);
  const assignment = await prisma.classArmSubject.upsert({
    where: {
      classArmId_subjectId_termId: {
        classArmId: input.classArmId,
        subjectId: input.subjectId,
        termId: input.termId,
      },
    },
    update: { teacherId: input.teacherId },
    create: { ...input, tenantId },
  });
  res.status(201).json(assignment);
});

export const listClassSubjects = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { classArmId, termId } = req.query as { classArmId?: string; termId?: string };
  const assignments = await prisma.classArmSubject.findMany({
    where: { tenantId, classArmId, termId },
    include: { subject: true, teacher: { include: { user: true } } },
  });
  res.json(assignments);
});
