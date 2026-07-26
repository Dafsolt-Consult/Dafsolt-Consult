import { z } from "zod";

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm format, e.g. 08:30");

export const createPeriodSchema = z
  .object({
    classArmId: z.string().cuid(),
    subjectId: z.string().cuid(),
    teacherId: z.string().cuid().optional(),
    // Not .cuid(): the seed script assigns AcademicSession/Term deterministic
    // non-cuid ids (`${tenantId}-2025-2026`) for idempotent re-seeding, so
    // existence is enforced by the DB foreign key instead.
    termId: z.string().min(1),
    dayOfWeek: z.number().int().min(1).max(7),
    startTime: timeString,
    endTime: timeString,
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const updatePeriodSchema = z.object({
  subjectId: z.string().cuid().optional(),
  teacherId: z.string().cuid().optional(),
  dayOfWeek: z.number().int().min(1).max(7).optional(),
  startTime: timeString.optional(),
  endTime: timeString.optional(),
});
