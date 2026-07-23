import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { updateTenantProfileSchema } from "./tenants.schema";

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
