import { z } from "zod";

export const upsertResultSchema = z.object({
  studentId: z.string().cuid(),
  classArmId: z.string().cuid(),
  subjectId: z.string().cuid(),
  // Not .cuid(): the seed script assigns AcademicSession/Term deterministic
  // non-cuid ids (`${tenantId}-2025-2026`) for idempotent re-seeding, so
  // existence is enforced by the DB foreign key instead.
  sessionId: z.string().min(1),
  termId: z.string().min(1),
  caScore: z.number().int().min(0).max(40),
  examScore: z.number().int().min(0).max(60),
});

export const generateReportCardsSchema = z.object({
  classArmId: z.string().cuid(),
  sessionId: z.string().min(1),
  termId: z.string().min(1),
});
