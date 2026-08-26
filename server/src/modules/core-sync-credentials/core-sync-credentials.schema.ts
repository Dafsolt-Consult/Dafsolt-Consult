import { z } from "zod";

export const receiveSyncCredentialSchema = z.object({
  tenantSlug: z.string().min(1),
  module: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});
