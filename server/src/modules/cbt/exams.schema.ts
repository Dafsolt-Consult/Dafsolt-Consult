import { z } from "zod";

export const createExamSchema = z.object({
  title: z.string().min(2).max(150),
  subjectId: z.string().cuid(),
  classLevelId: z.string().cuid(),
  sessionId: z.string().cuid(),
  termId: z.string().cuid(),
  instructions: z.string().max(2000).optional(),
  durationMinutes: z.number().int().positive().max(300).default(30),
  passMark: z.number().int().min(0).max(100).default(50),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
});

export const updateExamSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  instructions: z.string().max(2000).optional(),
  durationMinutes: z.number().int().positive().max(300).optional(),
  passMark: z.number().int().min(0).max(100).optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "ONGOING", "COMPLETED", "ARCHIVED"]).optional(),
});

export const addExamQuestionsSchema = z.object({
  questionIds: z.array(z.string().cuid()).min(1),
});
