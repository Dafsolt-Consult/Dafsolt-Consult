import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { resolveStudentParam } from "../../utils/resolveStudentId";
import { markAttendanceSchema } from "./attendance.schema";

export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = markAttendanceSchema.parse(req.body);

  const results = await prisma.$transaction(
    input.records.map((record) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: record.studentId, date: input.date } },
        update: { status: record.status, remark: record.remark, recordedById: req.auth!.userId },
        create: {
          tenantId,
          studentId: record.studentId,
          classArmId: input.classArmId,
          date: input.date,
          status: record.status,
          remark: record.remark,
          recordedById: req.auth!.userId,
        },
      })
    )
  );

  res.status(201).json(results);
});

export const listAttendance = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { classArmId, studentId, from, to } = req.query as Record<string, string | undefined>;

  const attendances = await prisma.attendance.findMany({
    where: {
      tenantId,
      classArmId,
      studentId,
      date: from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined,
    },
    include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { date: "desc" },
  });

  res.json(attendances);
});

export const attendanceSummary = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const studentId = await resolveStudentParam(req, tenantId, req.params.studentId);
  const { from, to } = req.query as Record<string, string | undefined>;

  const grouped = await prisma.attendance.groupBy({
    by: ["status"],
    where: {
      tenantId,
      studentId,
      date: from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined,
    },
    _count: true,
  });

  res.json(grouped);
});
