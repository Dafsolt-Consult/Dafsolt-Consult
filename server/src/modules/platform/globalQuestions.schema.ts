import { z } from "zod";
import { findQuestionShapeIssue } from "../../utils/questionShape";

const optionSchema = z.object({
  text: z.string().min(1).max(500),
  isCorrect: z.boolean().default(false),
});

export const createGlobalSubjectSchema = z.object({
  name: z.string().min(1).max(80),
  code: z.string().min(1).max(20),
});

const globalQuestionBaseSchema = z.object({
  topic: z.string().max(80).optional(),
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "THEORY", "FILL_IN_BLANK"]),
  text: z.string().min(1),
  imageUrl: z.string().url().optional(),
  correctText: z.string().max(500).optional(),
  points: z.number().int().positive().max(100).default(1),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  // Nullable in the DB: original practice content isn't tied to a real
  // sitting. Present here for genuinely-dated licensed imports.
  year: z.number().int().min(1980).max(2100).optional(),
  options: z.array(optionSchema).optional(),
});

function addShapeIssue(data: z.infer<typeof globalQuestionBaseSchema>, ctx: z.RefinementCtx) {
  const issue = findQuestionShapeIssue(data);
  if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
}

export const createGlobalQuestionSchema = globalQuestionBaseSchema
  .extend({
    globalSubjectId: z.string().cuid(),
    examBoard: z.enum(["WAEC", "NECO", "UTME", "GENERAL"]),
    stage: z.enum(["PRIMARY", "JUNIOR_SECONDARY", "SENIOR_SECONDARY"]),
  })
  .superRefine(addShapeIssue);

export const updateGlobalQuestionSchema = z.object({
  topic: z.string().max(80).optional(),
  text: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  correctText: z.string().max(500).optional(),
  points: z.number().int().positive().max(100).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  year: z.number().int().min(1980).max(2100).optional(),
  options: z.array(optionSchema).optional(),
});

/** A platform admin builds several questions for one subject + exam board +
 * stage in one sitting and commits them together — e.g. importing a batch of
 * genuinely licensed past-question content — instead of the single-add form
 * per question. `year` is per-question since a real-world import batch can
 * span multiple exam sittings. */
export const bulkCreateGlobalQuestionsSchema = z.object({
  globalSubjectId: z.string().cuid(),
  examBoard: z.enum(["WAEC", "NECO", "UTME", "GENERAL"]),
  stage: z.enum(["PRIMARY", "JUNIOR_SECONDARY", "SENIOR_SECONDARY"]),
  questions: z.array(globalQuestionBaseSchema.superRefine(addShapeIssue)).min(1).max(50),
});
