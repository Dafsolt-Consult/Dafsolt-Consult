import { z } from "zod";

export const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  phone: z.string().max(30).optional(),
  role: z.enum([
    "TEACHER",
    "LIBRARIAN",
    "ACCOUNTANT",
    "SCHOOL_ADMIN",
    "NURSE",
    "HR_MANAGER",
    "TRANSPORT_OFFICER",
    "HOSTEL_WARDEN",
  ]),
  staffId: z.string().min(1).max(30).optional(),
  qualification: z.string().max(120).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  phone: z.string().max(30).optional(),
  isActive: z.boolean().optional(),
  baseSalary: z.number().int().nonnegative().optional(),
});
