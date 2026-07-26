import { z } from "zod";

export const submitAnswerSchema = z.object({
  questionId: z.string().cuid(),
  selectedOptionId: z.string().cuid().optional(),
  textAnswer: z.string().max(5000).optional(),
});

export const gradeAnswerSchema = z.object({
  pointsAwarded: z.number().int().min(0),
});

export type AnswerInput = z.infer<typeof submitAnswerSchema>;
