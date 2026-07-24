import { z } from "zod";

export const createCourseMaterialSchema = z.object({
  classArmId: z.string().cuid(),
  subjectId: z.string().cuid(),
  teacherId: z.string().cuid().optional(),
  title: z.string().min(2).max(150),
  description: z.string().max(2000).optional(),
  type: z.enum(["DOCUMENT", "VIDEO", "LINK", "OTHER"]).default("DOCUMENT"),
  url: z.string().url(),
});

export const updateCourseMaterialSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(["DOCUMENT", "VIDEO", "LINK", "OTHER"]).optional(),
  url: z.string().url().optional(),
});

export const createOnlineClassSessionSchema = z.object({
  classArmId: z.string().cuid(),
  subjectId: z.string().cuid(),
  teacherId: z.string().cuid().optional(),
  title: z.string().min(2).max(150),
  meetingUrl: z.string().url(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
});

export const updateOnlineClassSessionSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  meetingUrl: z.string().url().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});
