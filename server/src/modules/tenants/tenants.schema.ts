import { z } from "zod";

export const updateTenantProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  logoUrl: z.string().url().optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().max(60).optional(),
});

export const updateSubscriptionSchema = z.object({
  planTier: z.enum(["FREE", "BASIC", "PREMIUM"]).optional(),
  subscriptionStatus: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"]).optional(),
  subscriptionEndsAt: z.coerce.date().optional(),
  maxStudents: z.number().int().positive().optional(),
  maxStaff: z.number().int().positive().optional(),
});
