import { z } from "zod";

export const createFeeStructureSchema = z.object({
  classLevelId: z.string().cuid().optional(),
  sessionId: z.string().cuid(),
  termId: z.string().cuid(),
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
