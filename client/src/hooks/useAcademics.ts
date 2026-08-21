import { useFetch } from "./useFetch";
import { AcademicSession, ClassArm, ClassLevel, Subject, Term } from "../types";

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

/** Same resolution as currentSessionId, but returns the session object —
 * for the many pages that need `.terms` off it, not just the id. Always
 * use this (or currentSessionId) instead of `sessions.find(s => s.isCurrent)
 * ?? sessions[0]` directly, which reintroduces the termless-session bug. */
export function pickCurrentSession(sessions: AcademicSession[] | null): AcademicSession | undefined {
  const id = currentSessionId(sessions);
  return sessions?.find((s) => s.id === id);
}

/** Same problem as currentSessionId, one level down: a session's terms can
 * all have isCurrent=false (a bulk import, a cleared flag, ...), and
 * `terms.find(t => t.isCurrent)` alone then resolves to nothing. Falls back
 * to the session's first term. Always use this (or pickCurrentTerm) instead
 * of hand-rolling `terms?.find(t => t.isCurrent)?.id ?? ""` directly, which
 * silently blanks the page instead of degrading to *a* term. */
export function currentTermId(session: AcademicSession | undefined): string {
  const current = session?.terms?.find((t) => t.isCurrent);
  return current?.id ?? session?.terms?.[0]?.id ?? "";
}

/** Same resolution as currentTermId, but returns the term object. */
export function pickCurrentTerm(session: AcademicSession | undefined): Term | undefined {
  const id = currentTermId(session);
  return session?.terms?.find((t) => t.id === id);
}
