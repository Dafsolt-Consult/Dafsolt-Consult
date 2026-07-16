import { prisma } from "../../config/prisma";

/** Auto-grades every objective answer (MCQ / True-False / Fill-in-blank) in an
 * attempt, then rolls the totals up onto the attempt. Theory answers are left
 * ungraded (isCorrect = null) for a teacher to score manually. If the exam has
 * no theory questions the attempt is fully graded immediately. */
export async function autoGradeAttempt(attemptId: string) {
  const answers = await prisma.examAnswer.findMany({
    where: { attemptId },
    include: { question: { include: { options: true } } },
  });

  for (const answer of answers) {
    const { question } = answer;
    const points = question.points;

    if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
      const correctOption = question.options.find((o) => o.isCorrect);
      const isCorrect = !!answer.selectedOptionId && answer.selectedOptionId === correctOption?.id;
      await prisma.examAnswer.update({
        where: { id: answer.id },
        data: { isCorrect, pointsAwarded: isCorrect ? points : 0, gradedAt: new Date() },
      });
    } else if (question.type === "FILL_IN_BLANK") {
      const isCorrect =
        !!answer.textAnswer &&
        !!question.correctText &&
        answer.textAnswer.trim().toLowerCase() === question.correctText.trim().toLowerCase();
      await prisma.examAnswer.update({
        where: { id: answer.id },
        data: { isCorrect, pointsAwarded: isCorrect ? points : 0, gradedAt: new Date() },
      });
    }
    // THEORY answers are left untouched for manual grading.
  }

  await recomputeAttemptTotals(attemptId);
}

/** Rolls per-answer points up onto the attempt: autoScore covers objective
 * questions, manualScore covers theory questions graded by a teacher. The
 * attempt becomes GRADED once every answer has been scored. */
export async function recomputeAttemptTotals(attemptId: string) {
  const answers = await prisma.examAnswer.findMany({
    where: { attemptId },
    include: { question: { select: { type: true } } },
  });

  let autoScore = 0;
  let manualScore = 0;
  let allGraded = true;

  for (const answer of answers) {
    if (answer.question.type === "THEORY") {
      if (answer.gradedAt) manualScore += answer.pointsAwarded;
      else allGraded = false;
    } else {
      autoScore += answer.pointsAwarded;
    }
  }

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      autoScore,
      manualScore,
      totalScore: autoScore + manualScore,
      status: allGraded ? "GRADED" : "SUBMITTED",
    },
  });
}
