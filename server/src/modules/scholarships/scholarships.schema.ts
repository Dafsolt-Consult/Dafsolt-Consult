import { z } from "zod";

export const createScholarshipSchema = z
  .object({
    studentId: z.string().cuid(),
    name: z.string().min(2).max(150),
    discountType: z.enum(["PERCENT", "FIXED"]),
    amount: z.number().int().positive(),
    reason: z.string().max(2000).optional(),
  })
  .refine((v) => v.discountType !== "PERCENT" || v.amount <= 100, {
    message: "A percentage discount cannot exceed 100",
    path: ["amount"],
  });

export const updateScholarshipSchema = z.object({
  isActive: z.boolean().optional(),
});
