import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { addExamQuestionsSchema, createExamSchema, updateExamSchema } from "./exams.schema";

export const listExams = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { classLevelId, subjectId, status, termId } = req.query as Record<string, string | undefined>;

  const exams = await prisma.exam.findMany({
    where: { tenantId, classLevelId, subjectId, status: status as never, termId },
    include: { subject: true, classLevel: true, _count: { select: { examQuestions: true, attempts: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json(exams);
});

export const getExam = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const exam = await prisma.exam.findFirst({
    where: { id: req.params.examId, tenantId },
    include: {
      subject: true,
      classLevel: true,
      examQuestions: { include: { question: { include: { options: true } } }, orderBy: { order: "asc" } },
    },
  });
  if (!exam) throw ApiError.notFound("Exam not found");
  res.json(exam);
});

export const createExam = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createExamSchema.parse(req.body);

  const exam = await prisma.exam.create({
    data: { ...input, tenantId, createdById: req.auth.userId },
  });

  res.status(201).json(exam);
});

export const updateExam = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateExamSchema.parse(req.body);
  const existing = await prisma.exam.findFirst({ where: { id: req.params.examId, tenantId } });
  if (!existing) throw ApiError.notFound("Exam not found");

  const exam = await prisma.exam.update({ where: { id: existing.id }, data: input });
  res.json(exam);
});

export const addExamQuestions = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { questionIds } = addExamQuestionsSchema.parse(req.body);
  const exam = await prisma.exam.findFirst({ where: { id: req.params.examId, tenantId } });
  if (!exam) throw ApiError.notFound("Exam not found");

  const ownedCount = await prisma.question.count({ where: { id: { in: questionIds }, tenantId } });
  if (ownedCount !== questionIds.length) {
    throw ApiError.notFound("One or more questions not found");
  }

  const existingCount = await prisma.examQuestion.count({ where: { examId: exam.id } });

  const created = await prisma.$transaction(
    questionIds.map((questionId, i) =>
      prisma.examQuestion.upsert({
        where: { examId_questionId: { examId: exam.id, questionId } },
        update: {},
        create: { examId: exam.id, questionId, order: existingCount + i },
      })
    )
  );

  res.status(201).json(created);
});

export const removeExamQuestion = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const exam = await prisma.exam.findFirst({ where: { id: req.params.examId, tenantId } });
  if (!exam) throw ApiError.notFound("Exam not found");

  await prisma.examQuestion.deleteMany({ where: { examId: exam.id, questionId: req.params.questionId } });
  res.status(204).send();
});

export const examResultsOverview = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const exam = await prisma.exam.findFirst({ where: { id: req.params.examId, tenantId } });
  if (!exam) throw ApiError.notFound("Exam not found");

  const attempts = await prisma.examAttempt.findMany({
    where: { examId: exam.id },
    include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { totalScore: "desc" },
  });

  res.json(attempts);
});
