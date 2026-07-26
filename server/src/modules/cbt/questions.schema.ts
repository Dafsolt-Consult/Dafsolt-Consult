import { z } from "zod";
import { findQuestionShapeIssue } from "../../utils/questionShape";

const optionSchema = z.object({
  text: z.string().min(1).max(500),
  isCorrect: z.boolean().default(false),
});

const questionBaseSchema = z.object({
  topic: z.string().max(80).optional(),
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "THEORY", "FILL_IN_BLANK"]),
  text: z.string().min(1),
  imageUrl: z.string().url().optional(),
  correctText: z.string().max(500).optional(),
  points: z.number().int().positive().max(100).default(1),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  options: z.array(optionSchema).optional(),
});

function addShapeIssue(data: z.infer<typeof questionBaseSchema>, ctx: z.RefinementCtx) {
  const issue = findQuestionShapeIssue(data);
  if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
}

export const createQuestionSchema = questionBaseSchema
  .extend({
    subjectId: z.string().cuid(),
    classLevelId: z.string().cuid(),
  })
  .superRefine(addShapeIssue);

export const updateQuestionSchema = z.object({
  topic: z.string().max(80).optional(),
  text: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  correctText: z.string().max(500).optional(),
  points: z.number().int().positive().max(100).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  options: z.array(optionSchema).optional(),
});

/** A teacher builds several questions for the same subject + class level in
 * one sitting and commits them together, instead of repeating the single-add
 * form N times. */
export const bulkCreateQuestionsSchema = z.object({
  subjectId: z.string().cuid(),
  classLevelId: z.string().cuid(),
  questions: z.array(questionBaseSchema.superRefine(addShapeIssue)).min(1).max(50),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type BulkCreateQuestionsInput = z.infer<typeof bulkCreateQuestionsSchema>;
