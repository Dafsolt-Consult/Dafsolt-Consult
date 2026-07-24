import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { importGlobalQuestionsSchema } from "./practiceLibrary.schema";

export const listPracticeSubjects = asyncHandler(async (_req: Request, res: Response) => {
  const subjects = await prisma.globalSubject.findMany({ orderBy: { name: "asc" } });
  res.json(subjects);
});

export const listPracticeQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { globalSubjectId, examBoard, stage, topic } = req.query as Record<string, string | undefined>;
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);

  const where = {
    globalSubjectId,
    examBoard: examBoard as never,
    stage: stage as never,
    topic: topic ? { contains: topic, mode: "insensitive" as const } : undefined,
  };

  const [items, total] = await Promise.all([
    prisma.globalQuestion.findMany({
      where,
      include: { options: true, globalSubject: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.globalQuestion.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});

export const importPracticeQuestions = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const { globalQuestionIds, subjectId, classLevelId } = importGlobalQuestionsSchema.parse(req.body);

  const [subject, classLevel] = await Promise.all([
    prisma.subject.findFirst({ where: { id: subjectId, tenantId } }),
    prisma.classLevel.findFirst({ where: { id: classLevelId, tenantId } }),
  ]);
  if (!subject) throw ApiError.notFound("Subject not found");
  if (!classLevel) throw ApiError.notFound("Class level not found");

  const globalQuestions = await prisma.globalQuestion.findMany({
    where: { id: { in: globalQuestionIds } },
    include: { options: true },
  });
  if (globalQuestions.length !== globalQuestionIds.length) {
    throw ApiError.notFound("One or more practice questions not found");
  }

  const createdById = req.auth.userId;
  const created = await prisma.$transaction(
    globalQuestions.map((gq) =>
      prisma.question.create({
        data: {
          tenantId,
          subjectId,
          classLevelId,
          topic: gq.topic,
          type: gq.type,
          text: gq.text,
          imageUrl: gq.imageUrl,
          correctText: gq.correctText,
          points: gq.points,
          difficulty: gq.difficulty,
          createdById,
          options: {
            create: gq.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect, order: o.order })),
          },
        },
        include: { options: true },
      })
    )
  );

  res.status(201).json(created);
});
