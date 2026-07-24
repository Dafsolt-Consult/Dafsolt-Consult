import { z } from "zod";

export const createSessionSchema = z.object({
  name: z.string().min(4).max(20),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional(),
});

export const createTermSchema = z.object({
  // Not .cuid(): the seed script assigns AcademicSession/Term deterministic
  // non-cuid ids (`${tenantId}-2025-2026`) for idempotent re-seeding, so
  // format validation would reject perfectly valid rows. Existence is
  // enforced by the DB foreign key, not this schema.
  sessionId: z.string().min(1),
  name: z.string().min(2).max(30),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional(),
});

export const createClassLevelSchema = z.object({
  name: z.string().min(2).max(40),
  stage: z.enum(["PRIMARY", "JUNIOR_SECONDARY", "SENIOR_SECONDARY"]),
  order: z.number().int().min(0),
});

export const createClassArmSchema = z.object({
  classLevelId: z.string().cuid(),
  name: z.string().min(1).max(30),
  formTeacherId: z.string().cuid().optional(),
  capacity: z.number().int().positive().optional(),
});

export const updateClassArmSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  formTeacherId: z.string().cuid().nullable().optional(),
  capacity: z.number().int().positive().optional(),
});

export const createSubjectSchema = z.object({
  name: z.string().min(2).max(60),
  code: z.string().min(1).max(20),
  isCore: z.boolean().optional(),
  classLevelIds: z.array(z.string().cuid()).optional(),
});

export const assignClassSubjectSchema = z.object({
  classArmId: z.string().cuid(),
  subjectId: z.string().cuid(),
  teacherId: z.string().cuid().optional(),
  // See createTermSchema above for why these aren't .cuid().
  sessionId: z.string().min(1),
  termId: z.string().min(1),
});
