import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { PLAN_DEFAULTS } from "../../utils/planLimits";
import { updateSubscriptionSchema, updateTenantProfileSchema } from "./tenants.schema";
import { ApiError } from "../../utils/ApiError";

export const listTenants = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);

  const [items, total] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        country: true,
        planTier: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        createdAt: true,
        _count: { select: { students: true, users: true } },
      },
    }),
    prisma.tenant.count(),
  ]);

  res.json({ items, total, page, pageSize });
});

export const getCurrentTenant = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  res.json(tenant);
});

export const updateCurrentTenant = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateTenantProfileSchema.parse(req.body);
  const tenant = await prisma.tenant.update({ where: { id: tenantId }, data: input });
  res.json(tenant);
});

export const updateSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const input = updateSubscriptionSchema.parse(req.body);

  const data = { ...input } as typeof input;
  if (input.planTier && input.maxStudents === undefined && input.maxStaff === undefined) {
    const defaults = PLAN_DEFAULTS[input.planTier];
    data.maxStudents = defaults.maxStudents;
    data.maxStaff = defaults.maxStaff;
  }

  const tenant = await prisma.tenant.update({ where: { id: tenantId }, data });
  res.json(tenant);
});

export const getTenantById = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw ApiError.notFound("School not found");
  res.json(tenant);
});
