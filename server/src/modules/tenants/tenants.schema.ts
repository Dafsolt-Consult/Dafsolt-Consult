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
  promotionPassMark: z.number().int().min(0).max(100).optional(),
});
