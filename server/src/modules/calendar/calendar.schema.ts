import { z } from "zod";

export const createCalendarEventSchema = z.object({
  title: z.string().min(2).max(150),
  description: z.string().max(2000).optional(),
  type: z.enum(["HOLIDAY", "EXAM", "ACADEMIC", "EVENT", "MEETING"]).default("EVENT"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

export const updateCalendarEventSchema = createCalendarEventSchema.partial();
