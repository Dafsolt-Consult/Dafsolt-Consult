import { z } from "zod";

export const markAttendanceSchema = z.object({
  classArmId: z.string().cuid(),
  date: z.coerce.date(),
  records: z
    .array(
      z.object({
        studentId: z.string().cuid(),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
        remark: z.string().max(200).optional(),
      })
    )
    .min(1),
});
