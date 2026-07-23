import { PlatformRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { comparePassword, hashPassword } from "../../utils/password";
import { hashToken } from "../../utils/hashToken";
import { signAccessToken } from "../../utils/jwt";
import {
  signPlatformAccessToken,
  signPlatformRefreshToken,
  verifyPlatformRefreshToken,
} from "../../utils/platformJwt";
import ms from "../../utils/ms";
import { PLAN_DEFAULTS } from "../../utils/planLimits";
import {
  CreatePlatformAdminInput,
  ImpersonateInput,
  UpdatePlatformAdminInput,
  UpdateTenantSubscriptionInput,
} from "./platform.schema";

const ADMIN_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

async function issueSession(platformAdminId: string, role: PlatformRole) {
  const accessToken = signPlatformAccessToken({ sub: platformAdminId, role });
  const refreshToken = signPlatformRefreshToken(platformAdminId);

  await prisma.platformRefreshToken.create({
    data: {
      platformAdminId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + ms(env.jwtRefreshTtl)),
    },
  });

  const admin = await prisma.platformAdmin.findUniqueOrThrow({
    where: { id: platformAdminId },
    select: ADMIN_SELECT,
  });

  return { accessToken, refreshToken, admin };
}

export async function login(email: string, password: string) {
  const admin = await prisma.platformAdmin.findUnique({ where: { email } });
  if (!admin || !admin.isActive) throw ApiError.unauthorized("Invalid email or password");

  const valid = await comparePassword(password, admin.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  await prisma.platformAdmin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

  return issueSession(admin.id, admin.role);
}

export async function refreshSession(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyPlatformRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.platformRefreshToken.findFirst({
    where: { platformAdminId: payload.sub, tokenHash, revokedAt: null },
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token expired or revoked");
  }

  const admin = await prisma.platformAdmin.findUnique({ where: { id: payload.sub } });
  if (!admin || !admin.isActive) throw ApiError.unauthorized();

  await prisma.platformRefreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  return issueSession(admin.id, admin.role);
}

export async function logout(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.platformRefreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(platformAdminId: string) {
  return prisma.platformAdmin.findUniqueOrThrow({ where: { id: platformAdminId }, select: ADMIN_SELECT });
}

export async function listTenants(page: number, pageSize: number) {
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
  return { items, total, page, pageSize };
}

export async function getTenantById(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { _count: { select: { students: true, users: true } } },
  });
  if (!tenant) throw ApiError.notFound("School not found");
  return tenant;
}

export async function updateTenantSubscription(tenantId: string, input: UpdateTenantSubscriptionInput) {
  const data = { ...input } as typeof input;
  if (input.planTier && input.maxStudents === undefined && input.maxStaff === undefined) {
    const defaults = PLAN_DEFAULTS[input.planTier];
    data.maxStudents = defaults.maxStudents;
    data.maxStaff = defaults.maxStaff;
  }
  return prisma.tenant.update({ where: { id: tenantId }, data });
}

export async function listAdmins() {
  return prisma.platformAdmin.findMany({ select: ADMIN_SELECT, orderBy: { createdAt: "asc" } });
}

export async function createAdmin(input: CreatePlatformAdminInput) {
  const existing = await prisma.platformAdmin.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict("A platform admin with this email already exists");

  const passwordHash = await hashPassword(input.password);
  return prisma.platformAdmin.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
    },
    select: ADMIN_SELECT,
  });
}

export async function updateAdmin(
  adminId: string,
  input: UpdatePlatformAdminInput,
  actingAdminId: string
) {
  const existing = await prisma.platformAdmin.findUnique({ where: { id: adminId } });
  if (!existing) throw ApiError.notFound("Platform admin not found");

  if (adminId === actingAdminId && (input.isActive === false || input.role === "SUPPORT")) {
    throw ApiError.badRequest("You cannot deactivate or demote your own account");
  }

  const { newPassword, ...rest } = input;
  const data: typeof rest & { passwordHash?: string } = { ...rest };
  if (newPassword) {
    data.passwordHash = await hashPassword(newPassword);
    // A password reset should kill any existing sessions for that admin.
    await prisma.platformRefreshToken.updateMany({
      where: { platformAdminId: adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  return prisma.platformAdmin.update({ where: { id: adminId }, data, select: ADMIN_SELECT });
}

/** Mints a normal tenant-scoped access token for a real User belonging to
 * `tenantId`, so the existing tenant authenticate/authorize/resolveTenantId
 * middleware and every existing module work completely unmodified. No
 * refresh token is issued — the session is a hard ~15min window with no
 * renewal, by design (see plan doc for why). */
export async function impersonate(
  tenantId: string,
  input: ImpersonateInput,
  platformAdminId: string,
  ipAddress: string | undefined
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw ApiError.notFound("School not found");

  const targetUser = input.asUserId
    ? await prisma.user.findFirst({ where: { id: input.asUserId, tenantId, isActive: true } })
    : await prisma.user.findFirst({
        where: { tenantId, role: "SCHOOL_ADMIN", isActive: true },
        orderBy: { createdAt: "asc" },
      });

  if (!targetUser) {
    throw ApiError.notFound(
      input.asUserId ? "That user was not found in this school" : "This school has no active admin to impersonate"
    );
  }

  const accessToken = signAccessToken({
    sub: targetUser.id,
    tenantId,
    role: targetUser.role,
    impersonatedBy: platformAdminId,
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: targetUser.id,
      platformAdminId,
      action: "START_IMPERSONATION",
      entityType: "Tenant",
      entityId: tenantId,
      metadata: { asUserId: targetUser.id, asUserEmail: targetUser.email, asUserRole: targetUser.role },
      ipAddress,
    },
  });

  return {
    accessToken,
    expiresIn: env.jwtAccessTtl,
    user: { id: targetUser.id, email: targetUser.email, firstName: targetUser.firstName, lastName: targetUser.lastName, role: targetUser.role },
  };
}

export async function listAuditLog(params: {
  tenantId?: string;
  action?: string;
  entityType?: string;
  page: number;
  pageSize: number;
}) {
  const where = {
    tenantId: params.tenantId,
    action: params.action,
    entityType: params.entityType,
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        platformAdmin: { select: { firstName: true, lastName: true, email: true } },
        tenant: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page: params.page, pageSize: params.pageSize };
}
