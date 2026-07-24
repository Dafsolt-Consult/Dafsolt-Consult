import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { resolveStudentParam } from "../../utils/resolveStudentId";
import { createHealthIncidentSchema, updateHealthIncidentSchema, upsertHealthRecordSchema } from "./health.schema";

const studentInclude = {
  student: { include: { user: { select: { firstName: true, lastName: true } } } },
} as const;

export const listHealthIncidents = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { studentId } = req.query as Record<string, string | undefined>;

  const incidents = await prisma.healthIncident.findMany({
    where: { tenantId, studentId },
    include: studentInclude,
    orderBy: { incidentDate: "desc" },
  });

  res.json(incidents);
});

export const createHealthIncident = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createHealthIncidentSchema.parse(req.body);

  const student = await prisma.student.findFirst({ where: { id: input.studentId, tenantId } });
  if (!student) throw ApiError.notFound("Student not found");

  const incident = await prisma.healthIncident.create({
    data: { ...input, tenantId, recordedById: req.auth.userId },
    include: studentInclude,
  });

  res.status(201).json(incident);
});

export const updateHealthIncident = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateHealthIncidentSchema.parse(req.body);

  const existing = await prisma.healthIncident.findFirst({ where: { id: req.params.incidentId, tenantId } });
  if (!existing) throw ApiError.notFound("Health incident not found");

  const incident = await prisma.healthIncident.update({
    where: { id: req.params.incidentId },
    data: input,
    include: studentInclude,
  });

  res.json(incident);
});

export const getHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);

  const student = await prisma.student.findFirst({ where: { id: req.params.studentId, tenantId } });
  if (!student) throw ApiError.notFound("Student not found");

  const record = await prisma.healthRecord.findFirst({ where: { tenantId, studentId: req.params.studentId } });
  res.json(record);
});

/** Create-or-update: a student either has one HealthRecord or none — there's
 * no "log a new profile" action the way there is for incidents. */
export const upsertHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = upsertHealthRecordSchema.parse(req.body);

  const student = await prisma.student.findFirst({ where: { id: req.params.studentId, tenantId } });
  if (!student) throw ApiError.notFound("Student not found");

  const record = await prisma.healthRecord.upsert({
    where: { studentId: req.params.studentId },
    update: { ...input, updatedById: req.auth.userId },
    create: { ...input, tenantId, studentId: req.params.studentId, updatedById: req.auth.userId },
  });

  res.json(record);
});

/** Combined read-only view used by the student's own page and the parent
 * portal's per-child "Health" tab. */
export const getStudentHealthView = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const studentId = await resolveStudentParam(req, tenantId, req.params.studentId);

  const [record, incidents] = await Promise.all([
    prisma.healthRecord.findFirst({ where: { tenantId, studentId } }),
    prisma.healthIncident.findMany({ where: { tenantId, studentId }, orderBy: { incidentDate: "desc" } }),
  ]);

  res.json({ record, incidents });
});
