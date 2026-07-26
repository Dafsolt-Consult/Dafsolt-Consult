import { Request, Response } from "express";
import { QuestionType } from "@prisma/client";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { seededShuffle } from "../../utils/shuffle";
import { checkPracticeAnswersSchema, importGlobalQuestionsSchema } from "./practiceLibrary.schema";

// Auto-gradable types only — THEORY has no objective key to check instantly,
// which is the whole point of a self-serve practice mode.
const PRACTICE_TYPES: QuestionType[] = ["MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_IN_BLANK"];

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

// ── Student-facing practice mode ────────────────────────────────────────────
// Deliberately stateless: no ExamAttempt-style persistence, since a practice
// session is instant-feedback and not a graded record. `startPracticeSession`
// never exposes `isCorrect`/`correctText` — `checkPracticeAnswers` looks the
// answer key up server-side, same discipline as attempts.controller.ts's
// serializeAttemptForStudent for real exams.

export const startPracticeSession = asyncHandler(async (req: Request, res: Response) => {
  const { globalSubjectId, examBoard, year } = req.query as Record<string, string | undefined>;
  const count = Math.min(Math.max(Number(req.query.count ?? 20), 1), 50);

  const pool = await prisma.globalQuestion.findMany({
    where: {
      globalSubjectId,
      examBoard: examBoard as never,
      year: year ? Number(year) : undefined,
      type: { in: PRACTICE_TYPES },
    },
    include: { options: true, globalSubject: true },
  });

  const picked = seededShuffle(pool, `practice-pick:${Date.now()}:${Math.random()}`).slice(0, count);

  const questions = picked.map((q) => ({
    id: q.id,
    subject: q.globalSubject.name,
    examBoard: q.examBoard,
    year: q.year,
    topic: q.topic,
    type: q.type,
    text: q.text,
    imageUrl: q.imageUrl,
    points: q.points,
    options: seededShuffle(q.options, `practice-opts:${q.id}:${Math.random()}`).map(({ id, text }) => ({ id, text })),
  }));

  res.json({ questions });
});

export const checkPracticeAnswers = asyncHandler(async (req: Request, res: Response) => {
  const { answers } = checkPracticeAnswersSchema.parse(req.body);

  const questions = await prisma.globalQuestion.findMany({
    where: { id: { in: answers.map((a) => a.questionId) } },
    include: { options: true },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));

  let score = 0;
  const total = questions.reduce((sum, q) => sum + q.points, 0);

  const results = answers.map((a) => {
    const question = byId.get(a.questionId);
    if (!question) return { questionId: a.questionId, isCorrect: false, correctOptionId: null, correctText: null };

    const correctOption = question.options.find((o) => o.isCorrect);
    let isCorrect = false;
    if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
      isCorrect = !!a.selectedOptionId && a.selectedOptionId === correctOption?.id;
    } else if (question.type === "FILL_IN_BLANK") {
      isCorrect =
        !!a.textAnswer && !!question.correctText && a.textAnswer.trim().toLowerCase() === question.correctText.trim().toLowerCase();
    }
    if (isCorrect) score += question.points;

    return {
      questionId: a.questionId,
      isCorrect,
      correctOptionId: correctOption?.id ?? null,
      correctText: question.correctText ?? null,
    };
  });

  res.json({ score, total, results });
});
