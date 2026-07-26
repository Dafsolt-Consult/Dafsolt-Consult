import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { bulkCreateQuestionsSchema, createQuestionSchema, findQuestionShapeIssue, updateQuestionSchema } from "./questions.schema";

export const listQuestions = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { subjectId, classLevelId, topic, type, difficulty } = req.query as Record<string, string | undefined>;
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);

  const where = {
    tenantId,
    subjectId,
    classLevelId,
    topic: topic ? { contains: topic, mode: "insensitive" as const } : undefined,
    type: type as never,
    difficulty: difficulty as never,
  };

  const [items, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: { options: true, subject: true, classLevel: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});

export const createQuestion = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createQuestionSchema.parse(req.body);

  const question = await prisma.question.create({
    data: {
      tenantId,
      subjectId: input.subjectId,
      classLevelId: input.classLevelId,
      topic: input.topic,
      type: input.type,
      text: input.text,
      imageUrl: input.imageUrl,
      correctText: input.correctText,
      points: input.points,
      difficulty: input.difficulty,
      createdById: req.auth.userId,
      options: input.options ? { create: input.options.map((o, order) => ({ ...o, order })) } : undefined,
    },
    include: { options: true },
  });

  res.status(201).json(question);
});

export const updateQuestion = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { options, ...input } = updateQuestionSchema.parse(req.body);
  const existing = await prisma.question.findFirst({ where: { id: req.params.questionId, tenantId } });
  if (!existing) throw ApiError.notFound("Question not found");

  if (options) {
    const answerCount = await prisma.examAnswer.count({ where: { questionId: existing.id } });
    if (answerCount > 0) {
      throw ApiError.conflict("This question has already been answered in an exam attempt, so its options can no longer be changed");
    }

    const issue = findQuestionShapeIssue({ type: existing.type, options, correctText: existing.correctText ?? undefined });
    if (issue) throw ApiError.badRequest(issue);
  }

  const question = await prisma.$transaction(async (tx) => {
    if (options) {
      await tx.questionOption.deleteMany({ where: { questionId: existing.id } });
      await tx.questionOption.createMany({
        data: options.map((o, order) => ({ ...o, questionId: existing.id, order })),
      });
    }
    return tx.question.update({ where: { id: existing.id }, data: input, include: { options: true } });
  });

  res.json(question);
});

export const bulkCreateQuestions = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const { subjectId, classLevelId, questions } = bulkCreateQuestionsSchema.parse(req.body);

  const [subject, classLevel] = await Promise.all([
    prisma.subject.findFirst({ where: { id: subjectId, tenantId } }),
    prisma.classLevel.findFirst({ where: { id: classLevelId, tenantId } }),
  ]);
  if (!subject) throw ApiError.notFound("Subject not found");
  if (!classLevel) throw ApiError.notFound("Class level not found");

  const createdById = req.auth.userId;
  const created = await prisma.$transaction(
    questions.map((q) =>
      prisma.question.create({
        data: {
          tenantId,
          subjectId,
          classLevelId,
          topic: q.topic,
          type: q.type,
          text: q.text,
          imageUrl: q.imageUrl,
          correctText: q.correctText,
          points: q.points,
          difficulty: q.difficulty,
          createdById,
          options: q.options ? { create: q.options.map((o, order) => ({ ...o, order })) } : undefined,
        },
        include: { options: true },
      })
    )
  );

  res.status(201).json(created);
});

export const deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.question.findFirst({ where: { id: req.params.questionId, tenantId } });
  if (!existing) throw ApiError.notFound("Question not found");

  const examCount = await prisma.examQuestion.count({ where: { questionId: existing.id } });
  if (examCount > 0) {
    throw ApiError.conflict("This question is attached to one or more exams. Remove it from those exams before deleting it from the bank");
  }

  const answerCount = await prisma.examAnswer.count({ where: { questionId: existing.id } });
  if (answerCount > 0) {
    throw ApiError.conflict("This question has already been answered in an exam attempt and can't be deleted");
  }

  await prisma.question.delete({ where: { id: existing.id } });
  res.status(204).send();
});
