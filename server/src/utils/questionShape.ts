export type QuestionTypeValue = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "THEORY" | "FILL_IN_BLANK";

/** Shared by the tenant question bank (questions.schema.ts) and the
 * platform-curated global question library (globalQuestions.schema.ts) —
 * both models have the same type/options/correctText shape rules. Used at
 * schema level on create (type is known up front) and at controller level
 * on update (type comes from the existing DB row, since it can't be
 * changed after creation). */
export function findQuestionShapeIssue(input: {
  type: QuestionTypeValue;
  options?: { isCorrect: boolean }[];
  correctText?: string;
}): string | null {
  if (input.type === "MULTIPLE_CHOICE") {
    if (!input.options || input.options.length < 2) return "Multiple choice questions need at least 2 options";
    if (input.options.filter((o) => o.isCorrect).length !== 1) return "Exactly one option must be marked correct";
  }
  if (input.type === "TRUE_FALSE") {
    if (!input.options || input.options.length !== 2) return "True/False questions need exactly 2 options";
    if (input.options.filter((o) => o.isCorrect).length !== 1) return "Exactly one of True/False must be marked correct";
  }
  if (input.type === "FILL_IN_BLANK" && !input.correctText) return "correctText is required for fill-in-the-blank questions";
  return null;
}
