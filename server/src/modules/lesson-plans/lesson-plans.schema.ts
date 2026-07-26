import { z } from "zod";

export const createLessonPlanSchema = z.object({
  classArmId: z.string().cuid(),
  subjectId: z.string().cuid(),
  // Not .cuid(): the seed script assigns AcademicSession/Term deterministic
  // non-cuid ids (`${tenantId}-2025-2026`) for idempotent re-seeding, so
  // existence is enforced by the DB foreign key instead.
  termId: z.string().min(1),
  teacherId: z.string().cuid().optional(),
  topic: z.string().min(2).max(150),
  objectives: z.string().max(4000).optional(),
  content: z.string().max(20000).optional(),
  attachmentUrl: z.string().url().optional(),
  date: z.coerce.date(),
});

export const updateLessonPlanSchema = z.object({
  topic: z.string().min(2).max(150).optional(),
  objectives: z.string().max(4000).optional(),
  content: z.string().max(20000).optional(),
  attachmentUrl: z.string().url().optional(),
  date: z.coerce.date().optional(),
});
