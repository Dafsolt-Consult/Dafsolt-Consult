import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import {
  createAssetCategorySchema,
  createAssetSchema,
  createMaintenanceLogSchema,
  createProcurementRequestSchema,
  createSupplySchema,
  reviewProcurementRequestSchema,
  supplyMovementSchema,
  updateAssetSchema,
} from "./inventory.schema";

// ── Asset categories ────────────────────────────────────────────────────

export const listAssetCategories = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const categories = await prisma.assetCategory.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
  res.json(categories);
});

export const createAssetCategory = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createAssetCategorySchema.parse(req.body);
  const category = await prisma.assetCategory.create({ data: { ...input, tenantId } });
  res.status(201).json(category);
});

// ── Assets ──────────────────────────────────────────────────────────────

export const listAssets = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { categoryId, status, search } = req.query as Record<string, string | undefined>;

  const assets = await prisma.asset.findMany({
    where: {
      tenantId,
      categoryId,
      status: status as never,
      name: search ? { contains: search, mode: "insensitive" } : undefined,
    },
    include: { category: true, _count: { select: { maintenanceLogs: true } } },
    orderBy: { name: "asc" },
  });
  res.json(assets);
});

export const createAsset = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createAssetSchema.parse(req.body);
  const asset = await prisma.asset.create({ data: { ...input, tenantId }, include: { category: true } });
  res.status(201).json(asset);
});

export const updateAsset = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateAssetSchema.parse(req.body);
  const existing = await prisma.asset.findFirst({ where: { id: req.params.assetId, tenantId } });
  if (!existing) throw ApiError.notFound("Asset not found");
  const asset = await prisma.asset.update({ where: { id: existing.id }, data: input, include: { category: true } });
  res.json(asset);
});

export const listMaintenanceLogs = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const asset = await prisma.asset.findFirst({ where: { id: req.params.assetId, tenantId } });
  if (!asset) throw ApiError.notFound("Asset not found");

  const logs = await prisma.maintenanceLog.findMany({
    where: { tenantId, assetId: asset.id },
    orderBy: { performedAt: "desc" },
  });
  res.json(logs);
});

export const createMaintenanceLog = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createMaintenanceLogSchema.parse(req.body);

  const asset = await prisma.asset.findFirst({ where: { id: req.params.assetId, tenantId } });
  if (!asset) throw ApiError.notFound("Asset not found");

  const [log] = await prisma.$transaction([
    prisma.maintenanceLog.create({
      data: { ...input, tenantId, assetId: asset.id, loggedById: req.auth.userId },
    }),
    prisma.asset.update({ where: { id: asset.id }, data: { status: "UNDER_MAINTENANCE" } }),
  ]);

  res.status(201).json(log);
});

// ── Supplies ────────────────────────────────────────────────────────────

export const listSupplies = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const supplies = await prisma.supply.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
  res.json(supplies.map((s) => ({ ...s, lowStock: s.quantityOnHand <= s.reorderLevel })));
});

export const createSupply = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createSupplySchema.parse(req.body);
  const supply = await prisma.supply.create({ data: { ...input, tenantId } });
  res.status(201).json(supply);
});

export const recordSupplyMovement = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = supplyMovementSchema.parse(req.body);

  const supply = await prisma.supply.findFirst({ where: { id: req.params.supplyId, tenantId } });
  if (!supply) throw ApiError.notFound("Supply not found");

  const delta = input.type === "ISSUED" ? -Math.abs(input.quantity) : input.type === "RECEIVED" ? Math.abs(input.quantity) : input.quantity;
  const newQuantity = supply.quantityOnHand + delta;
  if (newQuantity < 0) throw ApiError.conflict("This movement would take stock below zero");

  const [movement, updatedSupply] = await prisma.$transaction([
    prisma.supplyMovement.create({
      data: { tenantId, supplyId: supply.id, type: input.type, quantity: delta, note: input.note, recordedById: req.auth?.userId },
    }),
    prisma.supply.update({ where: { id: supply.id }, data: { quantityOnHand: newQuantity } }),
  ]);

  res.status(201).json({ movement, supply: updatedSupply });
});

// ── Procurement ─────────────────────────────────────────────────────────

export const listProcurementRequests = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { status } = req.query as Record<string, string | undefined>;
  const requests = await prisma.procurementRequest.findMany({
    where: { tenantId, status: status as never },
    include: {
      requestedBy: { select: { firstName: true, lastName: true } },
      approvedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(requests);
});

export const createProcurementRequest = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createProcurementRequestSchema.parse(req.body);

  const request = await prisma.procurementRequest.create({
    data: { ...input, tenantId, requestedById: req.auth.userId },
    include: { requestedBy: { select: { firstName: true, lastName: true } } },
  });
  res.status(201).json(request);
});

export const reviewProcurementRequest = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = reviewProcurementRequestSchema.parse(req.body);

  const existing = await prisma.procurementRequest.findFirst({ where: { id: req.params.requestId, tenantId } });
  if (!existing) throw ApiError.notFound("Procurement request not found");

  const request = await prisma.procurementRequest.update({
    where: { id: existing.id },
    data: { status: input.status, approvedById: req.auth.userId },
    include: {
      requestedBy: { select: { firstName: true, lastName: true } },
      approvedBy: { select: { firstName: true, lastName: true } },
    },
  });
  res.json(request);
});
