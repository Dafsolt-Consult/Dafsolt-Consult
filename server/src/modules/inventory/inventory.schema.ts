import { z } from "zod";

export const createAssetCategorySchema = z.object({
  name: z.string().min(2).max(100),
});

export const createAssetSchema = z.object({
  categoryId: z.string().cuid().optional(),
  name: z.string().min(2).max(150),
  assetTag: z.string().min(1).max(60),
  serialNumber: z.string().max(100).optional(),
  location: z.string().max(150).optional(),
  condition: z.enum(["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"]).default("GOOD"),
  purchaseDate: z.coerce.date().optional(),
  purchaseCost: z.number().int().nonnegative().optional(),
});

export const updateAssetSchema = z.object({
  categoryId: z.string().cuid().optional(),
  name: z.string().min(2).max(150).optional(),
  location: z.string().max(150).optional(),
  condition: z.enum(["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"]).optional(),
  status: z.enum(["IN_USE", "IN_STORAGE", "UNDER_MAINTENANCE", "DISPOSED"]).optional(),
});

export const createMaintenanceLogSchema = z.object({
  description: z.string().min(2).max(2000),
  cost: z.number().int().nonnegative().default(0),
  vendor: z.string().max(150).optional(),
  performedAt: z.coerce.date().optional(),
});

export const createSupplySchema = z.object({
  name: z.string().min(2).max(150),
  unit: z.string().min(1).max(30),
  reorderLevel: z.number().int().nonnegative().default(0),
});

export const supplyMovementSchema = z.object({
  type: z.enum(["RECEIVED", "ISSUED", "ADJUSTED"]),
  quantity: z.number().int(),
  note: z.string().max(300).optional(),
});

export const createProcurementRequestSchema = z.object({
  itemName: z.string().min(2).max(150),
  quantity: z.number().int().positive(),
  estimatedCost: z.number().int().nonnegative().optional(),
  reason: z.string().max(1000).optional(),
});

export const reviewProcurementRequestSchema = z.object({
  status: z.enum(["APPROVED", "ORDERED", "RECEIVED", "REJECTED"]),
});
