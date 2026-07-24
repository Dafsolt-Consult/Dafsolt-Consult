import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { addGuardianSchema, createStudentSchema, enrollStudentSchema, updateStudentSchema } from "./students.schema";
import * as studentsService from "./students.service";

export const listStudents = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { classArmId, sessionId, search } = req.query as Record<string, string | undefined>;
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);

  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where: {
        tenantId,
        enrollments: classArmId || sessionId ? { some: { classArmId, sessionId } } : undefined,
        user: search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined,
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true } },
        enrollments: { include: { classArm: { include: { classLevel: true } } }, orderBy: { enrolledAt: "desc" }, take: 1 },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { admissionDate: "desc" },
    }),
    prisma.student.count({ where: { tenantId } }),
  ]);

  res.json({ items, total, page, pageSize });
});

export const getStudent = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const student = await prisma.student.findFirst({
    where: { id: req.params.studentId, tenantId },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      enrollments: { include: { classArm: { include: { classLevel: true } }, session: true } },
      guardianLinks: { include: { guardian: true } },
    },
  });
  if (!student) throw ApiError.notFound("Student not found");
  res.json(student);
});

export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createStudentSchema.parse(req.body);
  const student = await studentsService.createStudent(tenantId, input);
  res.status(201).json(student);
});

export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateStudentSchema.parse(req.body);
  const existing = await prisma.student.findFirst({ where: { id: req.params.studentId, tenantId } });
  if (!existing) throw ApiError.notFound("Student not found");

  const { firstName, lastName, ...studentFields } = input;
  const student = await prisma.student.update({
    where: { id: req.params.studentId },
    data: {
      ...studentFields,
      user: firstName || lastName ? { update: { firstName, lastName } } : undefined,
    },
  });
  res.json(student);
});

export const addGuardian = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = addGuardianSchema.parse(req.body);
  const link = await studentsService.addGuardian(tenantId, req.params.studentId, input);
  res.status(201).json(link);
});

/** A promotion suggestion, not a decision: for every student currently
 * enrolled in a class+session, averages their ResultEntry totalScore across
 * that whole session (all terms with entries) and flags whether it clears
 * the tenant's configurable promotionPassMark. The school admin reviews and
 * overrides per student on the Promotions page — nothing here writes
 * anything or infers a "next class" (ClassLevel.order isn't reliable enough
 * across real schools' data entry to auto-target one).
 */
export const listPromotionCandidates = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { classArmId, sessionId } = req.query as Record<string, string | undefined>;
  if (!classArmId || !sessionId) throw ApiError.badRequest("classArmId and sessionId are required");

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

  const [enrollments, resultEntries] = await Promise.all([
    prisma.enrollment.findMany({
      where: { classArmId, sessionId, student: { tenantId } },
      include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } },
    }),
    prisma.resultEntry.findMany({
      where: { tenantId, classArmId, sessionId },
      select: { studentId: true, totalScore: true },
    }),
  ]);

  const scoresByStudent = new Map<string, number[]>();
  for (const entry of resultEntries) {
    const scores = scoresByStudent.get(entry.studentId) ?? [];
    scores.push(entry.totalScore);
    scoresByStudent.set(entry.studentId, scores);
  }

  const candidates = enrollments.map(({ student }) => {
    const scores = scoresByStudent.get(student.id);
    const average = scores?.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return {
      studentId: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      average,
      meetsStandard: average !== null && average >= tenant.promotionPassMark,
    };
  });

  res.json({ promotionPassMark: tenant.promotionPassMark, candidates });
});

export const enrollStudent = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = enrollStudentSchema.parse(req.body);
  const student = await prisma.student.findFirst({ where: { id: req.params.studentId, tenantId } });
  if (!student) throw ApiError.notFound("Student not found");

  const enrollment = await prisma.enrollment.upsert({
    where: { studentId_sessionId: { studentId: student.id, sessionId: input.sessionId } },
    update: { classArmId: input.classArmId },
    create: { studentId: student.id, classArmId: input.classArmId, sessionId: input.sessionId },
  });
  res.status(201).json(enrollment);
});
