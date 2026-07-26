import { z } from "zod";

export const createFeeStructureSchema = z.object({
  classLevelId: z.string().cuid().optional(),
  // Not .cuid(): the seed script assigns AcademicSession/Term deterministic
  // non-cuid ids (`${tenantId}-2025-2026`) for idempotent re-seeding, so
  // existence is enforced by the DB foreign key instead.
  sessionId: z.string().min(1),
  termId: z.string().min(1),
  name: z.string().min(2).max(80),
  amount: z.number().int().positive(), // minor units (kobo)
});

export const generateInvoicesSchema = z.object({
  feeStructureId: z.string().cuid(),
  classArmId: z.string().cuid(),
  dueDate: z.coerce.date(),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().cuid(),
  amount: z.number().int().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER", "PAYSTACK", "FLUTTERWAVE", "USSD", "MOBILE_MONEY"]),
  reference: z.string().max(120).optional(),
});
