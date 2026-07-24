/** WAEC/NECO-style grading used across West African primary & secondary schools. */
export function gradeFor(totalScore: number): { grade: string; remark: string } {
  if (totalScore >= 70) return { grade: "A", remark: "Excellent" };
  if (totalScore >= 60) return { grade: "B", remark: "Very Good" };
  if (totalScore >= 50) return { grade: "C", remark: "Good" };
  if (totalScore >= 45) return { grade: "D", remark: "Fair" };
  if (totalScore >= 40) return { grade: "E", remark: "Pass" };
  return { grade: "F", remark: "Fail" };
}
