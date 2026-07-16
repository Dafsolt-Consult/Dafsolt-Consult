import { z } from "zod";

export const createSessionSchema = z.object({
  name: z.string().min(4).max(20),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional(),
});

export const createTermSchema = z.object({
  sessionId: z.string().cuid(),
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
  sessionId: z.string().cuid(),
  termId: z.string().cuid(),
});
