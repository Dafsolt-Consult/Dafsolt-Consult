import { z } from "zod";

export const kioskLoginSchema = z.object({
  tenantSlug: z.string().min(1).max(80),
  admissionNumber: z.string().min(1).max(30),
  fullName: z.string().min(1).max(120),
});
