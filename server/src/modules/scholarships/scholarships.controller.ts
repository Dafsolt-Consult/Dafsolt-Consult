import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { resolveStudentParam } from "../../utils/resolveStudentId";
import { createScholarshipSchema, updateScholarshipSchema } from "./scholarships.schema";

export const listScholarships = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const studentIdParam = req.query.studentId as string | undefined;
  if (!studentIdParam && (req.auth?.role === "STUDENT" || req.auth?.role === "PARENT")) {
    throw ApiError.forbidden("studentId is required");
  }
  const studentId = studentIdParam ? await resolveStudentParam(req, tenantId, studentIdParam) : undefined;

  const scholarships = await prisma.scholarship.findMany({
    where: { tenantId, studentId },
    include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  res.json(scholarships);
});

export const createScholarship = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createScholarshipSchema.parse(req.body);

  const student = await prisma.student.findFirst({ where: { id: input.studentId, tenantId } });
  if (!student) throw ApiError.notFound("Student not found");

  const scholarship = await prisma.scholarship.create({
    data: { ...input, tenantId, approvedById: req.auth.userId },
    include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } },
  });

  res.status(201).json(scholarship);
});

export const updateScholarship = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateScholarshipSchema.parse(req.body);

  const existing = await prisma.scholarship.findFirst({ where: { id: req.params.scholarshipId, tenantId } });
  if (!existing) throw ApiError.notFound("Scholarship not found");

  const scholarship = await prisma.scholarship.update({ where: { id: existing.id }, data: input });
  res.json(scholarship);
});
