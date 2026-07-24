import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";

export const listTeachers = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const teachers = await prisma.teacher.findMany({
    where: { tenantId },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, isActive: true } },
      formArms: { include: { classLevel: true } },
      classSubjects: { include: { subject: true, classArm: true } },
    },
    orderBy: { hireDate: "desc" },
  });
  res.json(teachers);
});

export const getTeacher = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const teacher = await prisma.teacher.findFirst({
    where: { id: req.params.teacherId, tenantId },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      formArms: { include: { classLevel: true } },
      classSubjects: { include: { subject: true, classArm: true, term: true } },
    },
  });
  if (!teacher) throw ApiError.notFound("Teacher not found");
  res.json(teacher);
});
