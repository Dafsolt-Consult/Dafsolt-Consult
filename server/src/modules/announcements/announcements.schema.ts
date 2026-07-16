import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z.string().min(2).max(150),
  body: z.string().min(1).max(10000),
  audience: z.enum(["ALL", "STAFF", "PARENTS", "PRIMARY", "JUNIOR_SECONDARY", "SENIOR_SECONDARY"]).default("ALL"),
});
