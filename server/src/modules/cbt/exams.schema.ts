import { z } from "zod";

export const createExamSchema = z.object({
  title: z.string().min(2).max(150),
  subjectId: z.string().cuid(),
  classLevelId: z.string().cuid(),
  // Not .cuid(): the seed script assigns AcademicSession/Term deterministic
  // non-cuid ids (`${tenantId}-2025-2026`) for idempotent re-seeding, so
  // existence is enforced by the DB foreign key instead.
  sessionId: z.string().min(1),
  termId: z.string().min(1),
  instructions: z.string().max(2000).optional(),
  durationMinutes: z.number().int().positive().max(300).default(30),
  passMark: z.number().int().min(0).max(100).default(50),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
}).refine((v) => !v.startAt || !v.endAt || v.endAt > v.startAt, {
  message: "Closing time must be after opening time",
  path: ["endAt"],
});

export const updateExamSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  instructions: z.string().max(2000).optional(),
  durationMinutes: z.number().int().positive().max(300).optional(),
  passMark: z.number().int().min(0).max(100).optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  // Nullable (not just optional): the schedule UI needs to be able to
  // explicitly clear a previously-set startAt/endAt back to open-ended,
  // not just leave it unset on create.
  startAt: z.coerce.date().nullable().optional(),
  endAt: z.coerce.date().nullable().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "ONGOING", "COMPLETED", "ARCHIVED"]).optional(),
}).refine((v) => !v.startAt || !v.endAt || v.endAt > v.startAt, {
  message: "Closing time must be after opening time",
  path: ["endAt"],
});

export const addExamQuestionsSchema = z.object({
  questionIds: z.array(z.string().cuid()).min(1),
});
