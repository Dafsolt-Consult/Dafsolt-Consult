import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { loginSchema, onboardSchoolSchema, refreshSchema } from "./auth.schema";
import * as authService from "./auth.service";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

export const onboardSchool = asyncHandler(async (req: Request, res: Response) => {
  const input = onboardSchoolSchema.parse(req.body);
  const result = await authService.onboardSchool(input);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  res.json(result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await authService.refreshSession(refreshToken);
  res.json(result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  await authService.logout(refreshToken);
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.auth.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      tenantId: true,
      avatarUrl: true,
      tenant: { select: { id: true, name: true, slug: true, planTier: true, currency: true } },
    },
  });
  res.json(user);
});
