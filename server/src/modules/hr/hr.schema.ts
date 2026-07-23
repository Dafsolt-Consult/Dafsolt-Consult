import { z } from "zod";

export const markStaffAttendanceSchema = z.object({
  userId: z.string().cuid(),
  date: z.coerce.date(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "ON_LEAVE"]),
  remark: z.string().max(200).optional(),
});

export const createLeaveRequestSchema = z.object({
  type: z.enum(["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "UNPAID", "OTHER"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().max(1000).optional(),
});

export const reviewLeaveRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const createPayrollRunSchema = z.object({
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2000).max(2100),
});

export const upsertPayslipSchema = z.object({
  userId: z.string().cuid(),
  basicSalary: z.number().int().nonnegative(),
  allowances: z.number().int().nonnegative().default(0),
  deductions: z.number().int().nonnegative().default(0),
});

export const createPerformanceReviewSchema = z.object({
  userId: z.string().cuid(),
  period: z.string().min(2).max(50),
  rating: z.enum(["POOR", "FAIR", "GOOD", "VERY_GOOD", "EXCELLENT"]),
  comments: z.string().max(2000).optional(),
});
