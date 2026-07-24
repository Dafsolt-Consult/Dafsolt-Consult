import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { resolveStudentParam } from "../../utils/resolveStudentId";
import { createDisciplinaryRecordSchema, updateDisciplinaryRecordSchema } from "./disciplinary.schema";

const studentInclude = {
  student: { include: { user: { select: { firstName: true, lastName: true } } } },
} as const;

export const listDisciplinaryRecords = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { studentId, category, status } = req.query as Record<string, string | undefined>;

  const records = await prisma.disciplinaryRecord.findMany({
    where: {
      tenantId,
      studentId,
      category: category as never,
      status: status as never,
    },
    include: studentInclude,
    orderBy: { incidentDate: "desc" },
  });

  res.json(records);
});

export const getStudentDisciplinaryRecords = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const studentId = await resolveStudentParam(req, tenantId, req.params.studentId);

  const records = await prisma.disciplinaryRecord.findMany({
    where: { tenantId, studentId },
    orderBy: { incidentDate: "desc" },
  });

  res.json(records);
});

export const createDisciplinaryRecord = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createDisciplinaryRecordSchema.parse(req.body);

  const student = await prisma.student.findFirst({ where: { id: input.studentId, tenantId } });
  if (!student) throw ApiError.notFound("Student not found");

  const record = await prisma.disciplinaryRecord.create({
    data: { ...input, tenantId, recordedById: req.auth.userId },
    include: studentInclude,
  });

  res.status(201).json(record);
});

export const updateDisciplinaryRecord = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateDisciplinaryRecordSchema.parse(req.body);

  const existing = await prisma.disciplinaryRecord.findFirst({ where: { id: req.params.recordId, tenantId } });
  if (!existing) throw ApiError.notFound("Disciplinary record not found");

  const record = await prisma.disciplinaryRecord.update({
    where: { id: req.params.recordId },
    data: input,
    include: studentInclude,
  });

  res.json(record);
});
