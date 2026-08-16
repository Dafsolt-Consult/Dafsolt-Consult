import { z } from "zod";

export const onboardSchoolSchema = z.object({
  schoolName: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens")
    .optional()
    .or(z.literal("")),
  country: z.string().min(2).max(60).default("Nigeria"),
  currency: z.string().min(3).max(3).default("NGN"),
  adminFirstName: z.string().min(1).max(60),
  adminLastName: z.string().min(1).max(60),
  adminEmail: z.string().email(),
  adminPhone: z.string().min(5).max(30),
  adminPassword: z.string().min(8).max(72),
  // SCHOOL_GROUP is custom-priced and applied manually by a platform admin
  // after a sales conversation — not selectable through self-serve signup.
  planTier: z.enum(["STARTER", "GROWTH", "PROFESSIONAL", "ENTERPRISE"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export type OnboardSchoolInput = z.infer<typeof onboardSchoolSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
