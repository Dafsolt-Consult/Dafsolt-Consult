import { z } from "zod";

export const createAlumnusSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email().optional(),
  phone: z.string().min(5).max(30).optional(),
  graduationYear: z.number().int().min(1980).max(2100),
  lastClassLevelId: z.string().cuid().optional(),
  higherInstitution: z.string().max(200).optional(),
  occupation: z.string().max(120).optional(),
  employer: z.string().max(150).optional(),
  bio: z.string().max(2000).optional(),
});

export const promoteStudentSchema = z.object({
  graduationYear: z.number().int().min(1980).max(2100),
  lastClassLevelId: z.string().cuid().optional(),
  higherInstitution: z.string().max(200).optional(),
  occupation: z.string().max(120).optional(),
  employer: z.string().max(150).optional(),
  bio: z.string().max(2000).optional(),
});

export const updateAlumnusSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(5).max(30).optional(),
  graduationYear: z.number().int().min(1980).max(2100).optional(),
  lastClassLevelId: z.string().cuid().optional(),
  higherInstitution: z.string().max(200).optional(),
  occupation: z.string().max(120).optional(),
  employer: z.string().max(150).optional(),
  bio: z.string().max(2000).optional(),
});
