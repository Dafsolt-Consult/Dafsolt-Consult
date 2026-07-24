import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { createAlumnusSchema, promoteStudentSchema, updateAlumnusSchema } from "./alumni.schema";

const includeClassLevel = { lastClassLevel: true } as const;

export const listAlumni = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { graduationYear, lastClassLevelId, search } = req.query as Record<string, string | undefined>;

  const alumni = await prisma.alumnus.findMany({
    where: {
      tenantId,
      graduationYear: graduationYear ? Number(graduationYear) : undefined,
      lastClassLevelId,
      OR: search
        ? [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }]
        : undefined,
    },
    include: includeClassLevel,
    orderBy: [{ graduationYear: "desc" }, { lastName: "asc" }],
  });

  res.json(alumni);
});

export const getAlumnus = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const alumnus = await prisma.alumnus.findFirst({
    where: { id: req.params.alumnusId, tenantId },
    include: includeClassLevel,
  });
  if (!alumnus) throw ApiError.notFound("Alumnus not found");
  res.json(alumnus);
});

/** Manually add an alumnus with no linked Student record — covers graduates
 * who left before this system existed. */
export const createAlumnus = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createAlumnusSchema.parse(req.body);

  const alumnus = await prisma.alumnus.create({ data: { ...input, tenantId }, include: includeClassLevel });
  res.status(201).json(alumnus);
});

/** Creates an Alumnus record for an existing Student, pre-filled from their
 * user profile. Deliberately doesn't touch Student.status — an admin who
 * wants the two in sync sets status to GRADUATED separately via
 * PATCH /students/:studentId, same as any other status change. */
export const promoteStudentToAlumnus = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = promoteStudentSchema.parse(req.body);

  const student = await prisma.student.findFirst({
    where: { id: req.params.studentId, tenantId },
    include: { user: true, alumnusProfile: true },
  });
  if (!student) throw ApiError.notFound("Student not found");
  if (student.alumnusProfile) throw ApiError.conflict("This student already has an alumnus profile");

  const alumnus = await prisma.alumnus.create({
    data: {
      ...input,
      tenantId,
      studentId: student.id,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      email: student.user.email,
      phone: student.user.phone,
    },
    include: includeClassLevel,
  });

  res.status(201).json(alumnus);
});

export const updateAlumnus = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateAlumnusSchema.parse(req.body);
  const existing = await prisma.alumnus.findFirst({ where: { id: req.params.alumnusId, tenantId } });
  if (!existing) throw ApiError.notFound("Alumnus not found");

  const alumnus = await prisma.alumnus.update({ where: { id: existing.id }, data: input, include: includeClassLevel });
  res.json(alumnus);
});

export const deleteAlumnus = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.alumnus.findFirst({ where: { id: req.params.alumnusId, tenantId } });
  if (!existing) throw ApiError.notFound("Alumnus not found");

  await prisma.alumnus.delete({ where: { id: existing.id } });
  res.status(204).send();
});
