import { useFetch } from "./useFetch";
import { AcademicSession, ClassArm, ClassLevel, Subject } from "../types";

export function useSessions() {
  return useFetch<AcademicSession[]>("/academics/sessions");
}

export function useClassLevels() {
  return useFetch<ClassLevel[]>("/academics/class-levels");
}

export function useClassArms() {
  return useFetch<ClassArm[]>("/academics/class-arms");
}

export function useSubjects() {
  return useFetch<Subject[]>("/academics/subjects");
}

/** Prefers the session marked isCurrent, but only if it actually has terms —
 * a session can be marked current before its terms are added, and landing
 * on a termless session leaves every term-scoped picker with nothing to
 * select. Falls back to the first (sessions are sorted startDate desc,
 * so this is the most recent) session that has terms. */
export function currentSessionId(sessions: AcademicSession[] | null): string {
  const current = sessions?.find((s) => s.isCurrent);
  if (current?.terms?.length) return current.id;
  return sessions?.find((s) => s.terms?.length)?.id ?? current?.id ?? sessions?.[0]?.id ?? "";
}
