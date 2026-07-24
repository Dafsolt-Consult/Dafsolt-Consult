import { z } from "zod";

export const createHealthIncidentSchema = z.object({
  studentId: z.string().cuid(),
  incidentDate: z.coerce.date(),
  description: z.string().min(1).max(2000),
  actionTaken: z.string().max(2000).optional(),
});

export const updateHealthIncidentSchema = z.object({
  incidentDate: z.coerce.date().optional(),
  description: z.string().min(1).max(2000).optional(),
  actionTaken: z.string().max(2000).optional(),
});

export const upsertHealthRecordSchema = z.object({
  bloodGroup: z.string().max(20).optional(),
  genotype: z.string().max(10).optional(),
  allergies: z.string().max(2000).optional(),
  chronicConditions: z.string().max(2000).optional(),
  medications: z.string().max(2000).optional(),
  emergencyContactName: z.string().max(200).optional(),
  emergencyContactPhone: z.string().max(50).optional(),
  emergencyContactRelation: z.string().max(100).optional(),
  physicianName: z.string().max(200).optional(),
  physicianPhone: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});
