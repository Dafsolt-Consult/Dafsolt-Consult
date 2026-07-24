import { z } from "zod";

export const importGlobalQuestionsSchema = z.object({
  globalQuestionIds: z.array(z.string().cuid()).min(1).max(50),
  subjectId: z.string().cuid(),
  classLevelId: z.string().cuid(),
});
