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

export function currentSessionId(sessions: AcademicSession[] | null): string {
  return sessions?.find((s) => s.isCurrent)?.id ?? sessions?.[0]?.id ?? "";
}

export function currentTermId(sessions: AcademicSession[] | null): string {
  const session = sessions?.find((s) => s.isCurrent) ?? sessions?.[0];
  return session?.terms?.find((t) => t.isCurrent)?.id ?? session?.terms?.[0]?.id ?? "";
}
