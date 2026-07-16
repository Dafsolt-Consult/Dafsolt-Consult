import { z } from "zod";

export const createStudentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  admissionNumber: z.string().min(1).max(30),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  classArmId: z.string().cuid(),
  sessionId: z.string().cuid(),
  guardian: z
    .object({
      firstName: z.string().min(1).max(60),
      lastName: z.string().min(1).max(60),
      phone: z.string().min(5).max(30),
      email: z.string().email().optional(),
      relationship: z.string().min(2).max(30),
      password: z.string().min(8).max(72).optional(),
    })
    .refine((g) => !g.password || !!g.email, {
      message: "A parent login requires the guardian's email",
      path: ["email"],
    })
    .optional(),
});

export const addGuardianSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  phone: z.string().min(5).max(30),
  email: z.string().email().optional(),
  relationship: z.string().min(2).max(30),
  isPrimary: z.boolean().optional(),
  password: z.string().min(8).max(72).optional(),
})
  .refine((g) => !g.password || !!g.email, {
    message: "A parent login requires the guardian's email",
    path: ["email"],
  });

export const updateStudentSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  status: z.enum(["ACTIVE", "GRADUATED", "WITHDRAWN", "SUSPENDED"]).optional(),
});

export const enrollStudentSchema = z.object({
  classArmId: z.string().cuid(),
  sessionId: z.string().cuid(),
});
