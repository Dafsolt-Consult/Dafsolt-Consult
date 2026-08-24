import { z } from "zod";

export const dashboardSummarySchema = z.object({
  token: z.string().min(1),
});
