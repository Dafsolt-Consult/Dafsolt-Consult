import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import * as platformService from "./platform.service";
import * as platformAnalyticsService from "./platform.analytics.service";
import {
  createPlatformAdminSchema,
  impersonateSchema,
  platformLoginSchema,
  platformRefreshSchema,
  updatePlatformAdminSchema,
  updateTenantSubscriptionSchema,
} from "./platform.schema";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = platformLoginSchema.parse(req.body);
  const result = await platformService.login(email, password);
  res.json(result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = platformRefreshSchema.parse(req.body);
  const result = await platformService.refreshSession(refreshToken);
  res.json(result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = platformRefreshSchema.parse(req.body);
  await platformService.logout(refreshToken);
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.platformAuth) throw ApiError.unauthorized();
  const admin = await platformService.getMe(req.platformAuth.platformAdminId);
  res.json(admin);
});

export const listTenants = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);
  const { search, planTier, subscriptionStatus } = req.query as Record<string, string | undefined>;
  res.json(await platformService.listTenants(page, pageSize, { search, planTier, subscriptionStatus }));
});

export const getTenantById = asyncHandler(async (req: Request, res: Response) => {
  res.json(await platformService.getTenantById(req.params.tenantId));
});

export const updateTenantSubscription = asyncHandler(async (req: Request, res: Response) => {
  const input = updateTenantSubscriptionSchema.parse(req.body);
  res.json(await platformService.updateTenantSubscription(req.params.tenantId, input));
});

export const impersonate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.platformAuth) throw ApiError.unauthorized();
  const input = impersonateSchema.parse(req.body);
  const result = await platformService.impersonate(req.params.tenantId, input, req.platformAuth.platformAdminId, req.ip);
  res.json(result);
});

export const listAdmins = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await platformService.listAdmins());
});

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const input = createPlatformAdminSchema.parse(req.body);
  const admin = await platformService.createAdmin(input);
  res.status(201).json(admin);
});

export const updateAdmin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.platformAuth) throw ApiError.unauthorized();
  const input = updatePlatformAdminSchema.parse(req.body);
  const admin = await platformService.updateAdmin(req.params.adminId, input, req.platformAuth.platformAdminId);
  res.json(admin);
});

export const getAnalyticsOverview = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await platformAnalyticsService.getOverview());
});

export const listAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, action, entityType } = req.query as Record<string, string | undefined>;
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 50), 200);
  res.json(await platformService.listAuditLog({ tenantId, action, entityType, page, pageSize }));
});
