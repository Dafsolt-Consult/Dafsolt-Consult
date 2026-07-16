import { z } from "zod";

const optionSchema = z.object({
  text: z.string().min(1).max(500),
  isCorrect: z.boolean().default(false),
});

export const createQuestionSchema = z
  .object({
    subjectId: z.string().cuid(),
    classLevelId: z.string().cuid(),
    topic: z.string().max(80).optional(),
    type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "THEORY", "FILL_IN_BLANK"]),
    text: z.string().min(1),
    imageUrl: z.string().url().optional(),
    correctText: z.string().max(500).optional(),
    points: z.number().int().positive().max(100).default(1),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    options: z.array(optionSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "MULTIPLE_CHOICE") {
      if (!data.options || data.options.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Multiple choice questions need at least 2 options" });
      } else if (!data.options.some((o) => o.isCorrect)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Exactly one option must be marked correct" });
      }
    }
    if (data.type === "TRUE_FALSE") {
      if (!data.options || data.options.length !== 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "True/False questions need exactly 2 options" });
      }
    }
    if (data.type === "FILL_IN_BLANK" && !data.correctText) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "correctText is required for fill-in-the-blank questions" });
    }
  });

export const updateQuestionSchema = z.object({
  topic: z.string().max(80).optional(),
  text: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  correctText: z.string().max(500).optional(),
  points: z.number().int().positive().max(100).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
});
