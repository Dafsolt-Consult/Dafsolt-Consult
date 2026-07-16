import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { seededShuffle } from "../../utils/shuffle";
import { autoGradeAttempt, recomputeAttemptTotals } from "./grading.service";
import { gradeAnswerSchema, submitAnswerSchema } from "./attempts.schema";
import { Exam, ExamAttempt } from "@prisma/client";

function attemptDeadline(exam: Exam, attempt: ExamAttempt): Date {
  const durationDeadline = new Date(attempt.startedAt.getTime() + exam.durationMinutes * 60_000);
  if (exam.endAt && exam.endAt < durationDeadline) return exam.endAt;
  return durationDeadline;
}

async function currentStudentId(userId: string, tenantId: string) {
  const student = await prisma.student.findFirst({ where: { userId, tenantId } });
  if (!student) throw ApiError.forbidden("Only students can take exams");
  return student.id;
}

/** Lists exams a student is eligible to sit: matching class level, currently
 * open (SCHEDULED/ONGOING and within the start/end window) and not already
 * submitted or graded. */
export const listAvailableExams = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const studentId = await currentStudentId(req.auth.userId, tenantId);

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId },
    orderBy: { enrolledAt: "desc" },
    include: { classArm: true },
  });
  if (!enrollment) return res.json([]);

  const now = new Date();
  const exams = await prisma.exam.findMany({
    where: {
      tenantId,
      classLevelId: enrollment.classArm.classLevelId,
      status: { in: ["SCHEDULED", "ONGOING"] },
      OR: [{ startAt: null }, { startAt: { lte: now } }],
      AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
    },
    include: {
      subject: true,
      attempts: { where: { studentId }, select: { id: true, status: true } },
      _count: { select: { examQuestions: true } },
    },
  });

  res.json(exams);
});

export const startAttempt = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const studentId = await currentStudentId(req.auth.userId, tenantId);

  const exam = await prisma.exam.findFirst({
    where: { id: req.params.examId, tenantId },
    include: { examQuestions: { include: { question: { include: { options: true } } }, orderBy: { order: "asc" } } },
  });
  if (!exam) throw ApiError.notFound("Exam not found");
  if (!["SCHEDULED", "ONGOING"].includes(exam.status)) throw ApiError.forbidden("This exam is not currently open");

  const now = new Date();
  if (exam.startAt && exam.startAt > now) throw ApiError.forbidden("This exam has not started yet");
  if (exam.endAt && exam.endAt < now) throw ApiError.forbidden("This exam has closed");

  let attempt = await prisma.examAttempt.findUnique({ where: { examId_studentId: { examId: exam.id, studentId } } });

  if (!attempt) {
    const questionIds = exam.examQuestions.map((eq) => eq.questionId);
    const orderedIds = exam.shuffleQuestions ? seededShuffle(questionIds, `${exam.id}:${studentId}`) : questionIds;

    attempt = await prisma.examAttempt.create({
      data: { examId: exam.id, studentId, questionOrder: orderedIds },
    });

    if (exam.status === "SCHEDULED") {
      await prisma.exam.update({ where: { id: exam.id }, data: { status: "ONGOING" } });
    }
  }

  if (attempt.status !== "IN_PROGRESS") {
    throw ApiError.conflict("You have already submitted this exam");
  }

  res.status(200).json(serializeAttemptForStudent(exam, attempt));
});

export const getAttempt = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const studentId = await currentStudentId(req.auth.userId, tenantId);

  const attempt = await prisma.examAttempt.findFirst({ where: { id: req.params.attemptId, studentId } });
  if (!attempt) throw ApiError.notFound("Attempt not found");

  const exam = await prisma.exam.findFirstOrThrow({
    where: { id: attempt.examId, tenantId },
    include: { examQuestions: { include: { question: { include: { options: true } } } } },
  });

  const finalAttempt = await autoSubmitIfExpired(exam, attempt);
  const answers = await prisma.examAnswer.findMany({ where: { attemptId: attempt.id } });

  res.json({ ...serializeAttemptForStudent(exam, finalAttempt), answers: answers.map(publicAnswer) });
});

export const answerQuestion = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const studentId = await currentStudentId(req.auth.userId, tenantId);
  const input = submitAnswerSchema.parse(req.body);

  const attempt = await prisma.examAttempt.findFirst({ where: { id: req.params.attemptId, studentId } });
  if (!attempt) throw ApiError.notFound("Attempt not found");

  const exam = await prisma.exam.findFirstOrThrow({ where: { id: attempt.examId, tenantId } });
  const current = await autoSubmitIfExpired(exam, attempt);
  if (current.status !== "IN_PROGRESS") throw ApiError.conflict("This exam attempt has already ended");

  const answer = await prisma.examAnswer.upsert({
    where: { attemptId_questionId: { attemptId: attempt.id, questionId: input.questionId } },
    update: { selectedOptionId: input.selectedOptionId, textAnswer: input.textAnswer },
    create: {
      attemptId: attempt.id,
      questionId: input.questionId,
      selectedOptionId: input.selectedOptionId,
      textAnswer: input.textAnswer,
    },
  });

  res.status(200).json(publicAnswer(answer));
});

export const submitAttempt = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const studentId = await currentStudentId(req.auth.userId, tenantId);

  const attempt = await prisma.examAttempt.findFirst({ where: { id: req.params.attemptId, studentId } });
  if (!attempt) throw ApiError.notFound("Attempt not found");
  if (attempt.status !== "IN_PROGRESS") throw ApiError.conflict("This attempt has already been submitted");

  await prisma.examAttempt.update({ where: { id: attempt.id }, data: { submittedAt: new Date(), status: "SUBMITTED" } });
  await autoGradeAttempt(attempt.id);

  const graded = await prisma.examAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
  res.json(graded);
});

// ── Teacher-side manual grading of theory answers ───────────────────────────

export const gradeAnswer = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();

  const answer = await prisma.examAnswer.findFirst({
    where: { id: req.params.answerId, attempt: { id: req.params.attemptId, exam: { tenantId } } },
    include: { question: true },
  });
  if (!answer) throw ApiError.notFound("Answer not found");
  if (answer.question.type !== "THEORY") throw ApiError.badRequest("Only theory answers are graded manually");

  const { pointsAwarded } = gradeAnswerSchema.parse(req.body);
  if (pointsAwarded > answer.question.points) {
    throw ApiError.badRequest(`Points cannot exceed the question's maximum of ${answer.question.points}`);
  }

  await prisma.examAnswer.update({
    where: { id: answer.id },
    data: { pointsAwarded, gradedById: req.auth.userId, gradedAt: new Date() },
  });

  await recomputeAttemptTotals(req.params.attemptId);
  const attempt = await prisma.examAttempt.findUniqueOrThrow({ where: { id: req.params.attemptId } });
  res.json(attempt);
});

export const listAttemptAnswersForGrading = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: req.params.attemptId, exam: { tenantId } },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
      answers: { include: { question: { include: { options: true } }, selectedOption: true } },
    },
  });
  if (!attempt) throw ApiError.notFound("Attempt not found");
  res.json(attempt);
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function autoSubmitIfExpired(
  exam: Exam & { examQuestions?: unknown },
  attempt: ExamAttempt
): Promise<ExamAttempt> {
  if (attempt.status !== "IN_PROGRESS") return attempt;
  const deadline = attemptDeadline(exam, attempt);
  if (new Date() <= deadline) return attempt;

  await prisma.examAttempt.update({ where: { id: attempt.id }, data: { submittedAt: deadline, status: "SUBMITTED" } });
  await autoGradeAttempt(attempt.id);
  return prisma.examAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
}

function publicAnswer(answer: { id: string; questionId: string; selectedOptionId: string | null; textAnswer: string | null }) {
  return { id: answer.id, questionId: answer.questionId, selectedOptionId: answer.selectedOptionId, textAnswer: answer.textAnswer };
}

function serializeAttemptForStudent(
  exam: Exam & { examQuestions: { questionId: string; question: { id: string; text: string; type: string; imageUrl: string | null; points: number; options: { id: string; text: string }[] } }[] },
  attempt: ExamAttempt
) {
  const orderedIds = (attempt.questionOrder as string[]) ?? exam.examQuestions.map((eq) => eq.questionId);
  const questionsById = new Map(exam.examQuestions.map((eq) => [eq.questionId, eq.question]));

  const questions = orderedIds
    .map((id) => questionsById.get(id))
    .filter((q): q is NonNullable<typeof q> => !!q)
    .map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      imageUrl: q.imageUrl,
      points: q.points,
      options: exam.shuffleOptions
        ? seededShuffle(q.options, `${attempt.id}:${q.id}`).map(({ id, text }) => ({ id, text }))
        : q.options.map(({ id, text }) => ({ id, text })),
    }));

  return {
    attemptId: attempt.id,
    examId: exam.id,
    title: exam.title,
    instructions: exam.instructions,
    startedAt: attempt.startedAt,
    deadline: attemptDeadline(exam, attempt),
    status: attempt.status,
    questions,
  };
}
