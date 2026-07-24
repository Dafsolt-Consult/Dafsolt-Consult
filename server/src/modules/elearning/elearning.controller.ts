import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { resolveStudentParam } from "../../utils/resolveStudentId";
import { notifyUsers, studentAndGuardianUserIds } from "../../utils/notify";
import { ApiError } from "../../utils/ApiError";
import {
  createCourseMaterialSchema,
  createOnlineClassSessionSchema,
  updateCourseMaterialSchema,
  updateOnlineClassSessionSchema,
} from "./elearning.schema";

async function resolveTeacherId(req: Request, tenantId: string, input: { teacherId?: string }): Promise<string> {
  if (!req.auth) throw ApiError.unauthorized();
  if (req.auth.role === "TEACHER") {
    const teacher = await prisma.teacher.findFirst({ where: { userId: req.auth.userId, tenantId } });
    if (!teacher) throw ApiError.forbidden("This account is not linked to a teacher profile");
    return teacher.id;
  }
  if (!input.teacherId) throw ApiError.badRequest("teacherId is required");
  return input.teacherId;
}

async function classArmRecipients(classArmId: string): Promise<string[]> {
  const enrollments = await prisma.enrollment.findMany({ where: { classArmId }, select: { studentId: true } });
  const recipientLists = await Promise.all(enrollments.map((e) => studentAndGuardianUserIds(prisma, e.studentId)));
  return recipientLists.flat();
}

// ── Course materials ────────────────────────────────────────────────────

export const listCourseMaterials = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { classArmId, subjectId } = req.query as Record<string, string | undefined>;

  const materials = await prisma.courseMaterial.findMany({
    where: { tenantId, classArmId, subjectId },
    include: { subject: true, classArm: { include: { classLevel: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json(materials);
});

export const createCourseMaterial = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createCourseMaterialSchema.parse(req.body);
  const teacherId = await resolveTeacherId(req, tenantId, input);

  const material = await prisma.courseMaterial.create({ data: { ...input, teacherId, tenantId } });

  const recipients = await classArmRecipients(input.classArmId);
  await notifyUsers(prisma, tenantId, recipients, {
    subject: "New course material posted",
    message: `${material.title} has been added to your class.`,
  });

  res.status(201).json(material);
});

export const updateCourseMaterial = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateCourseMaterialSchema.parse(req.body);
  const existing = await prisma.courseMaterial.findFirst({ where: { id: req.params.materialId, tenantId } });
  if (!existing) throw ApiError.notFound("Course material not found");

  const material = await prisma.courseMaterial.update({ where: { id: existing.id }, data: input });
  res.json(material);
});

export const deleteCourseMaterial = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.courseMaterial.findFirst({ where: { id: req.params.materialId, tenantId } });
  if (!existing) throw ApiError.notFound("Course material not found");

  await prisma.courseMaterial.delete({ where: { id: existing.id } });
  res.status(204).send();
});

/** Course materials for a given student's current class, optionally
 * narrowed to one subject — used by both the student portal and the
 * parent dashboard (via resolveStudentParam ownership checks). */
export const listCourseMaterialsForStudent = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const studentId = await resolveStudentParam(req, tenantId, req.params.studentId);
  const { subjectId } = req.query as Record<string, string | undefined>;

  const enrollment = await prisma.enrollment.findFirst({ where: { studentId }, orderBy: { enrolledAt: "desc" } });
  if (!enrollment) return res.json([]);

  const materials = await prisma.courseMaterial.findMany({
    where: { tenantId, classArmId: enrollment.classArmId, subjectId },
    include: { subject: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(materials);
});

// ── Online class sessions ───────────────────────────────────────────────

export const listOnlineClassSessions = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { classArmId, subjectId, from, to } = req.query as Record<string, string | undefined>;

  const sessions = await prisma.onlineClassSession.findMany({
    where: {
      tenantId,
      classArmId,
      subjectId,
      startsAt: from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined,
    },
    include: { subject: true, classArm: { include: { classLevel: true } } },
    orderBy: { startsAt: "asc" },
  });

  res.json(sessions);
});

export const createOnlineClassSession = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createOnlineClassSessionSchema.parse(req.body);
  const teacherId = await resolveTeacherId(req, tenantId, input);

  const session = await prisma.onlineClassSession.create({ data: { ...input, teacherId, tenantId } });

  const recipients = await classArmRecipients(input.classArmId);
  await notifyUsers(prisma, tenantId, recipients, {
    subject: "New online class scheduled",
    message: `${session.title} starts ${session.startsAt.toLocaleString()}.`,
  });

  res.status(201).json(session);
});

export const updateOnlineClassSession = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateOnlineClassSessionSchema.parse(req.body);
  const existing = await prisma.onlineClassSession.findFirst({ where: { id: req.params.sessionId, tenantId } });
  if (!existing) throw ApiError.notFound("Online class session not found");

  const session = await prisma.onlineClassSession.update({ where: { id: existing.id }, data: input });
  res.json(session);
});

export const deleteOnlineClassSession = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.onlineClassSession.findFirst({ where: { id: req.params.sessionId, tenantId } });
  if (!existing) throw ApiError.notFound("Online class session not found");

  await prisma.onlineClassSession.delete({ where: { id: existing.id } });
  res.status(204).send();
});

/** Online class sessions for a given student's current class — used by
 * both the student portal and the parent dashboard. */
export const listOnlineClassSessionsForStudent = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const studentId = await resolveStudentParam(req, tenantId, req.params.studentId);

  const enrollment = await prisma.enrollment.findFirst({ where: { studentId }, orderBy: { enrolledAt: "desc" } });
  if (!enrollment) return res.json([]);

  const sessions = await prisma.onlineClassSession.findMany({
    where: { tenantId, classArmId: enrollment.classArmId },
    include: { subject: true },
    orderBy: { startsAt: "asc" },
  });

  res.json(sessions);
});
