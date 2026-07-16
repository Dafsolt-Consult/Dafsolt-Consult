import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { gradeFor } from "../../utils/grading";
import { resolveStudentParam } from "../../utils/resolveStudentId";
import { notifyUsers, studentAndGuardianUserIds } from "../../utils/notify";
import { generateReportCardsSchema, upsertResultSchema } from "./results.schema";

export const upsertResult = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = upsertResultSchema.parse(req.body);
  const totalScore = input.caScore + input.examScore;
  const { grade, remark } = gradeFor(totalScore);

  const result = await prisma.resultEntry.upsert({
    where: { studentId_subjectId_termId: { studentId: input.studentId, subjectId: input.subjectId, termId: input.termId } },
    update: { caScore: input.caScore, examScore: input.examScore, totalScore, grade, remark },
    create: { ...input, totalScore, grade, remark, tenantId },
  });

  res.status(201).json(result);
});

export const listResults = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { classArmId, subjectId, termId, studentId } = req.query as Record<string, string | undefined>;

  const results = await prisma.resultEntry.findMany({
    where: { tenantId, classArmId, subjectId, termId, studentId },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
      subject: true,
    },
    orderBy: { totalScore: "desc" },
  });

  res.json(results);
});

export const studentResultSheet = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const studentId = await resolveStudentParam(req, tenantId, req.params.studentId);
  const { termId } = req.query as Record<string, string | undefined>;

  const results = await prisma.resultEntry.findMany({
    where: { tenantId, studentId, termId },
    include: { subject: true },
    orderBy: { subject: { name: "asc" } },
  });

  res.json(results);
});

export const generateReportCards = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = generateReportCardsSchema.parse(req.body);

  const enrollments = await prisma.enrollment.findMany({
    where: { classArmId: input.classArmId, sessionId: input.sessionId },
    select: { studentId: true },
  });

  const totals = await Promise.all(
    enrollments.map(async ({ studentId }) => {
      const agg = await prisma.resultEntry.aggregate({
        where: { studentId, termId: input.termId },
        _sum: { totalScore: true },
      });
      return { studentId, total: agg._sum.totalScore ?? 0 };
    })
  );

  const ranked = [...totals].sort((a, b) => b.total - a.total);

  const reportCards = await Promise.all(
    ranked.map(async ({ studentId, total }, index) => {
      const attendanceCounts = await prisma.attendance.groupBy({
        by: ["status"],
        where: { studentId, classArmId: input.classArmId },
        _count: true,
      });
      const daysPresent = attendanceCounts.find((a) => a.status === "PRESENT")?._count ?? 0;
      const daysAbsent = attendanceCounts.find((a) => a.status === "ABSENT")?._count ?? 0;

      const reportCard = await prisma.reportCard.upsert({
        where: { studentId_termId: { studentId, termId: input.termId } },
        update: { position: index + 1, daysPresent, daysAbsent },
        create: {
          tenantId,
          studentId,
          classArmId: input.classArmId,
          sessionId: input.sessionId,
          termId: input.termId,
          position: index + 1,
          daysPresent,
          daysAbsent,
        },
      });

      const recipients = await studentAndGuardianUserIds(prisma, studentId);
      await notifyUsers(prisma, tenantId, recipients, {
        subject: "Report card published",
        message: `A new report card is available — position ${index + 1} in class.`,
      });

      return reportCard;
    })
  );

  res.status(201).json({ generated: reportCards.length, reportCards });
});

export const getReportCard = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const studentId = await resolveStudentParam(req, tenantId, req.params.studentId);
  const { termId } = req.params;

  const [reportCard, results] = await Promise.all([
    prisma.reportCard.findFirst({ where: { tenantId, studentId, termId }, include: { classArm: { include: { classLevel: true } } } }),
    prisma.resultEntry.findMany({ where: { tenantId, studentId, termId }, include: { subject: true } }),
  ]);

  res.json({ reportCard, results });
});
