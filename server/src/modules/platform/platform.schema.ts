import { z } from "zod";

export const platformLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const platformRefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const createPlatformAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  role: z.enum(["OWNER", "SUPPORT"]),
});

export const updatePlatformAdminSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  role: z.enum(["OWNER", "SUPPORT"]).optional(),
  isActive: z.boolean().optional(),
  // OWNER-driven password reset — no self-service email flow for v1 (see
  // plan doc); this lets an OWNER recover a locked-out admin directly.
  newPassword: z.string().min(8).max(72).optional(),
});

export const updateTenantSubscriptionSchema = z.object({
  planTier: z.enum(["STARTER", "GROWTH", "PROFESSIONAL", "ENTERPRISE", "SCHOOL_GROUP"]).optional(),
  subscriptionStatus: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"]).optional(),
  subscriptionEndsAt: z.coerce.date().optional(),
  maxStudents: z.number().int().positive().optional(),
  maxStaff: z.number().int().positive().optional(),
});

export const impersonateSchema = z.object({
  asUserId: z.string().min(1).optional(),
});

export type CreatePlatformAdminInput = z.infer<typeof createPlatformAdminSchema>;
export type UpdatePlatformAdminInput = z.infer<typeof updatePlatformAdminSchema>;
export type UpdateTenantSubscriptionInput = z.infer<typeof updateTenantSubscriptionSchema>;
export type ImpersonateInput = z.infer<typeof impersonateSchema>;
