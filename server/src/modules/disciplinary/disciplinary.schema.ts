import { z } from "zod";

export const createDisciplinaryRecordSchema = z.object({
  studentId: z.string().cuid(),
  category: z.enum(["MINOR", "MAJOR", "SEVERE"]),
  incidentDate: z.coerce.date(),
  description: z.string().min(1).max(2000),
  actionTaken: z.string().max(2000).optional(),
});

export const updateDisciplinaryRecordSchema = z.object({
  category: z.enum(["MINOR", "MAJOR", "SEVERE"]).optional(),
  incidentDate: z.coerce.date().optional(),
  description: z.string().min(1).max(2000).optional(),
  actionTaken: z.string().max(2000).optional(),
  status: z.enum(["OPEN", "RESOLVED"]).optional(),
});
