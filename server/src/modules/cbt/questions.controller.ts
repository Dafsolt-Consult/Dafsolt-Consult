import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { createQuestionSchema, updateQuestionSchema } from "./questions.schema";

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
  const input = updateQuestionSchema.parse(req.body);
  const existing = await prisma.question.findFirst({ where: { id: req.params.questionId, tenantId } });
  if (!existing) throw ApiError.notFound("Question not found");

  const question = await prisma.question.update({ where: { id: existing.id }, data: input });
  res.json(question);
});

export const deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.question.findFirst({ where: { id: req.params.questionId, tenantId } });
  if (!existing) throw ApiError.notFound("Question not found");

  await prisma.question.delete({ where: { id: existing.id } });
  res.status(204).send();
});
