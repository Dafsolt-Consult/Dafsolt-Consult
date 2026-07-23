import { z } from "zod";

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm format");

export const createTimetableSlotSchema = z
  .object({
    classArmId: z.string().cuid(),
    subjectId: z.string().cuid(),
    teacherId: z.string().cuid(),
    termId: z.string().cuid(),
    dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
    startTime: timeString,
    endTime: timeString,
  })
  .refine((v) => v.startTime < v.endTime, { message: "startTime must be before endTime", path: ["endTime"] });

export const updateTimetableSlotSchema = z
  .object({
    subjectId: z.string().cuid().optional(),
    teacherId: z.string().cuid().optional(),
    dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]).optional(),
    startTime: timeString.optional(),
    endTime: timeString.optional(),
  })
  .refine((v) => !v.startTime || !v.endTime || v.startTime < v.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });
