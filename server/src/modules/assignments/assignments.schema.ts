import { z } from "zod";

export const createAssignmentSchema = z.object({
  classArmId: z.string().cuid(),
  subjectId: z.string().cuid(),
  teacherId: z.string().cuid().optional(),
  title: z.string().min(2).max(150),
  description: z.string().max(4000).optional(),
  attachmentUrl: z.string().url().optional(),
  dueDate: z.coerce.date(),
  totalPoints: z.number().int().positive().max(1000).default(100),
});

export const updateAssignmentSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().max(4000).optional(),
  attachmentUrl: z.string().url().optional(),
  dueDate: z.coerce.date().optional(),
  totalPoints: z.number().int().positive().max(1000).optional(),
});

export const submitAssignmentSchema = z.object({
  submissionText: z.string().max(20000).optional(),
  attachmentUrl: z.string().url().optional(),
});

export const gradeSubmissionSchema = z.object({
  score: z.number().int().min(0),
  feedback: z.string().max(4000).optional(),
});
