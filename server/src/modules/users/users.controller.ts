import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { createStaffSchema, updateUserSchema } from "./users.schema";
import * as usersService from "./users.service";
import { ApiError } from "../../utils/ApiError";

export const listStaff = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const role = req.query.role as string | undefined;
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      role: role ? (role as never) : { in: ["SCHOOL_ADMIN", "TEACHER", "LIBRARIAN", "ACCOUNTANT"] },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      teacher: { select: { id: true, staffId: true, qualification: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

export const createStaff = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = createStaffSchema.parse(req.body);
  const user = await usersService.createStaffAccount(tenantId, input);
  res.status(201).json(user);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { userId } = req.params;
  const input = updateUserSchema.parse(req.body);

  const existing = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!existing) throw ApiError.notFound("User not found");

  const user = await prisma.user.update({ where: { id: userId }, data: input });
  res.json(user);
});
