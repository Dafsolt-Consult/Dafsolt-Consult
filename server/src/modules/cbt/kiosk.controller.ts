import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { signKioskAccessToken } from "../../utils/kioskJwt";
import { kioskLoginSchema } from "./kiosk.schema";
import { submitAnswerSchema } from "./attempts.schema";
import {
  answerQuestionCore,
  getAttemptCore,
  listAvailableExamsCore,
  startAttemptCore,
  submitAttemptCore,
} from "./attempts.controller";

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Supervised, in-person-verified login for the exam-hall kiosk: a name +
 * admission number isn't a real secret, so every failure path (unknown
 * school, unknown admission number, inactive student, name mismatch)
 * returns the exact same generic error — same "don't reveal which part was
 * wrong" discipline as auth.service.ts's real email/password login. */
export const kioskLogin = asyncHandler(async (req: Request, res: Response) => {
  const { tenantSlug, admissionNumber, fullName } = kioskLoginSchema.parse(req.body);
  const genericError = () => ApiError.unauthorized("Could not verify your details — check with your invigilator");

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw genericError();

  const student = await prisma.student.findUnique({
    where: { tenantId_admissionNumber: { tenantId: tenant.id, admissionNumber } },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!student || student.status !== "ACTIVE") throw genericError();

  const expectedName = normalizeName(`${student.user.firstName} ${student.user.lastName}`);
  if (normalizeName(fullName) !== expectedName) throw genericError();

  const accessToken = signKioskAccessToken({ sub: student.id, tenantId: tenant.id });
  res.json({
    accessToken,
    student: { firstName: student.user.firstName, lastName: student.user.lastName },
  });
});

function kioskContext(req: Request) {
  if (!req.kioskAuth) throw ApiError.unauthorized();
  return req.kioskAuth;
}

export const kioskListAvailableExams = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, studentId } = kioskContext(req);
  res.json(await listAvailableExamsCore(tenantId, studentId));
});

export const kioskStartAttempt = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, studentId } = kioskContext(req);
  res.status(200).json(await startAttemptCore(tenantId, studentId, req.params.examId));
});

export const kioskGetAttempt = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, studentId } = kioskContext(req);
  res.json(await getAttemptCore(tenantId, studentId, req.params.attemptId));
});

export const kioskAnswerQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, studentId } = kioskContext(req);
  const input = submitAnswerSchema.parse(req.body);
  res.status(200).json(await answerQuestionCore(tenantId, studentId, req.params.attemptId, input));
});

export const kioskSubmitAttempt = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, studentId } = kioskContext(req);
  res.json(await submitAttemptCore(tenantId, studentId, req.params.attemptId));
});
