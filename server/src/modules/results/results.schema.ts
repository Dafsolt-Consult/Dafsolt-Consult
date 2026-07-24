import { z } from "zod";

export const upsertResultSchema = z.object({
  studentId: z.string().cuid(),
  classArmId: z.string().cuid(),
  subjectId: z.string().cuid(),
  sessionId: z.string().cuid(),
  termId: z.string().cuid(),
  caScore: z.number().int().min(0).max(40),
  examScore: z.number().int().min(0).max(60),
});

export const generateReportCardsSchema = z.object({
  classArmId: z.string().cuid(),
  sessionId: z.string().cuid(),
  termId: z.string().cuid(),
});
