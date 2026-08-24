import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { createStaffSchema, updateUserSchema } from "./users.schema";
import * as usersService from "./users.service";
import * as hrSync from "../hr-sync/hr-sync.service";
import * as notificationsSync from "../notifications-sync/notifications-sync.service";
import { ApiError } from "../../utils/ApiError";
import { env } from "../../config/env";

export const listStaff = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const role = req.query.role as string | undefined;
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      role: role
        ? (role as never)
        : {
            in: [
              "SCHOOL_ADMIN",
              "TEACHER",
              "LIBRARIAN",
              "ACCOUNTANT",
              "NURSE",
              "HR_MANAGER",
              "TRANSPORT_OFFICER",
              "HOSTEL_WARDEN",
            ],
          },
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
      baseSalary: true,
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

  // Fire-and-forget: never awaited, a Core outage must never affect this
  // response. hireDate falls back to createdAt for the 7 non-Teacher
  // roles, which have no dedicated hireDate field of their own.
  void hrSync.syncEmployment(tenantId, {
    email: user.email,
    status: "active",
    hireDate: (user.teacher?.hireDate ?? user.createdAt).toISOString(),
    jobTitle: user.role,
  });

  // Same fire-and-forget posture as HR sync above. School Manager sends no
  // welcome/invite email of its own on this path (the admin sets the new
  // staff member's password directly, communicated out-of-band) — no
  // duplicate-email overlap to reason about here, unlike PMS's pilot.
  void notificationsSync.sendWelcome(tenantId, {
    email: user.email,
    recipientName: `${user.firstName} ${user.lastName}`,
    loginUrl: `${env.clientUrl}/login`,
  });

  res.status(201).json(user);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { userId } = req.params;
  const input = updateUserSchema.parse(req.body);

  const existing = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!existing) throw ApiError.notFound("User not found");

  const user = await prisma.user.update({ where: { id: userId }, data: input });

  // Only re-sync on an actual status change — don't fire on unrelated
  // profile edits (name/phone/baseSalary). No on_leave signal exists on
  // this app's side (confirmed in E0): isActive is a hard boolean, so the
  // mapping is permanently lossy, not a bug.
  if (input.isActive !== undefined) {
    void hrSync.syncEmployment(tenantId, {
      email: user.email,
      status: user.isActive ? "active" : "terminated",
    });
  }

  res.json(user);
});
