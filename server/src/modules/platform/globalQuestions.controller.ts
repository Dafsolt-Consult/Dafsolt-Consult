import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { createGlobalQuestionSchema, createGlobalSubjectSchema, updateGlobalQuestionSchema } from "./globalQuestions.schema";

export const listGlobalSubjects = asyncHandler(async (_req: Request, res: Response) => {
  const subjects = await prisma.globalSubject.findMany({ orderBy: { name: "asc" } });
  res.json(subjects);
});

export const createGlobalSubject = asyncHandler(async (req: Request, res: Response) => {
  const input = createGlobalSubjectSchema.parse(req.body);
  const subject = await prisma.globalSubject.create({ data: input });
  res.status(201).json(subject);
});

export const listGlobalQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { globalSubjectId, examBoard, stage } = req.query as Record<string, string | undefined>;
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);

  const where = {
    globalSubjectId,
    examBoard: examBoard as never,
    stage: stage as never,
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

export const createGlobalQuestion = asyncHandler(async (req: Request, res: Response) => {
  if (!req.platformAuth) throw ApiError.unauthorized();
  const input = createGlobalQuestionSchema.parse(req.body);

  const question = await prisma.globalQuestion.create({
    data: {
      globalSubjectId: input.globalSubjectId,
      examBoard: input.examBoard,
      stage: input.stage,
      topic: input.topic,
      type: input.type,
      text: input.text,
      imageUrl: input.imageUrl,
      correctText: input.correctText,
      points: input.points,
      difficulty: input.difficulty,
      createdByAdminId: req.platformAuth.platformAdminId,
      options: input.options ? { create: input.options.map((o, order) => ({ ...o, order })) } : undefined,
    },
    include: { options: true },
  });

  res.status(201).json(question);
});

export const updateGlobalQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { options, ...input } = updateGlobalQuestionSchema.parse(req.body);
  const existing = await prisma.globalQuestion.findUnique({ where: { id: req.params.questionId } });
  if (!existing) throw ApiError.notFound("Question not found");

  const question = await prisma.$transaction(async (tx) => {
    if (options) {
      await tx.globalQuestionOption.deleteMany({ where: { globalQuestionId: existing.id } });
      await tx.globalQuestionOption.createMany({
        data: options.map((o, order) => ({ ...o, globalQuestionId: existing.id, order })),
      });
    }
    return tx.globalQuestion.update({ where: { id: existing.id }, data: input, include: { options: true } });
  });

  res.json(question);
});

export const deleteGlobalQuestion = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.globalQuestion.findUnique({ where: { id: req.params.questionId } });
  if (!existing) throw ApiError.notFound("Question not found");

  await prisma.globalQuestion.delete({ where: { id: existing.id } });
  res.status(204).send();
});
