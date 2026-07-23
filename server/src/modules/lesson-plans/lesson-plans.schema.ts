import { z } from "zod";

export const createLessonPlanSchema = z.object({
  classArmId: z.string().cuid(),
  subjectId: z.string().cuid(),
  termId: z.string().cuid(),
  teacherId: z.string().cuid().optional(),
  topic: z.string().min(2).max(150),
  objectives: z.string().max(4000).optional(),
  content: z.string().max(20000).optional(),
  attachmentUrl: z.string().url().optional(),
  date: z.coerce.date(),
});

export const updateLessonPlanSchema = z.object({
  topic: z.string().min(2).max(150).optional(),
  objectives: z.string().max(4000).optional(),
  content: z.string().max(20000).optional(),
  attachmentUrl: z.string().url().optional(),
  date: z.coerce.date().optional(),
});
