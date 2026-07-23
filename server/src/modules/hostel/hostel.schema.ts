import { z } from "zod";

export const createHostelSchema = z.object({
  name: z.string().min(2).max(150),
  type: z.enum(["BOYS", "GIRLS", "MIXED"]).default("MIXED"),
  wardenId: z.string().cuid().optional(),
  address: z.string().max(300).optional(),
});

export const updateHostelSchema = createHostelSchema.partial();

export const createRoomSchema = z.object({
  hostelId: z.string().cuid(),
  number: z.string().min(1).max(30),
  capacity: z.number().int().positive().max(50).default(4),
});

export const updateRoomSchema = z.object({
  number: z.string().min(1).max(30).optional(),
  capacity: z.number().int().positive().max(50).optional(),
});

export const createAllocationSchema = z.object({
  studentId: z.string().cuid(),
  roomId: z.string().cuid(),
  sessionId: z.string().cuid(),
  feeAmount: z.number().int().nonnegative().default(0),
});

export const checkOutSchema = z.object({
  checkOutDate: z.coerce.date().optional(),
});

export const recordHostelPaymentSchema = z.object({
  allocationId: z.string().cuid(),
  amount: z.number().int().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER", "PAYSTACK", "FLUTTERWAVE", "USSD", "MOBILE_MONEY"]),
  reference: z.string().max(150).optional(),
});
