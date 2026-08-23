import { z } from "zod";

export const ssoCallbackSchema = z.object({
  token: z.string().min(1),
});
