import { randomBytes } from "crypto";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { comparePassword, hashPassword } from "../../utils/password";
import { hashToken } from "../../utils/hashToken";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { logAudit } from "../../utils/audit";
import { LoginInput, OnboardSchoolInput } from "./auth.schema";
import ms from "../../utils/ms";

const TRIAL_DAYS = 30;
const RESET_TOKEN_TTL_MS = ms("1h");

export async function onboardSchool(input: OnboardSchoolInput) {
  const existingSlug = await prisma.tenant.findUnique({ where: { slug: input.slug } });
  if (existingSlug) throw ApiError.conflict("This school URL is already taken");

  const existingEmail = await prisma.user.findUnique({ where: { email: input.adminEmail } });
  if (existingEmail) throw ApiError.conflict("An account with this email already exists");

  const passwordHash = await hashPassword(input.adminPassword);
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const tenant = await prisma.tenant.create({
    data: {
      name: input.schoolName,
      slug: input.slug,
      country: input.country,
      currency: input.currency,
      trialEndsAt,
      users: {
        create: {
          email: input.adminEmail,
          passwordHash,
          role: "SCHOOL_ADMIN",
          firstName: input.adminFirstName,
          lastName: input.adminLastName,
        },
      },
    },
    include: { users: true },
  });

  const adminUser = tenant.users[0];
  return issueSession(adminUser.id, tenant.id, adminUser.role);
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) throw ApiError.unauthorized("Invalid email or password");

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (tenant && tenant.subscriptionStatus === "CANCELED") {
      throw ApiError.forbidden("This school's subscription has been canceled");
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return issueSession(user.id, user.tenantId, user.role);
}

export async function refreshSession(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { userId: payload.sub, tokenHash, revokedAt: null },
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token expired or revoked");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw ApiError.unauthorized();

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  return issueSession(user.id, user.tenantId, user.role);
}

export async function logout(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Always succeeds silently whether or not the email exists, so the
 * response can't be used to enumerate registered accounts. Works for every
 * role — SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, STUDENT, PARENT, LIBRARIAN,
 * ACCOUNTANT — since it operates on the shared User model, not a
 * role-specific one. */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;

  const rawToken = randomBytes(32).toString("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetLink = `${env.clientUrl}/reset-password?token=${rawToken}`;

  // No email/SMS provider is wired up yet (see README roadmap) — log the
  // link so an operator with server access can relay it to the user until
  // a real provider is integrated. The raw token is never returned via the
  // API or persisted anywhere other than its hash.
  console.log(`[password reset] ${user.role} <${user.email}> requested a reset: ${resetLink}`);
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken);
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null },
    include: { user: true },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    throw ApiError.badRequest("This reset link is invalid or has expired");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });
    await tx.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } });
    // Force re-login everywhere: a leaked/guessed old session shouldn't
    // survive a password reset.
    await tx.refreshToken.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await logAudit(tx, {
      tenantId: resetToken.user.tenantId,
      actorId: resetToken.userId,
      action: "PASSWORD_RESET",
      targetType: "User",
      targetId: resetToken.userId,
    });
  });
}

async function issueSession(userId: string, tenantId: string | null, role: import("@prisma/client").UserRole) {
  const accessToken = signAccessToken({ sub: userId, tenantId, role });
  const refreshToken = signRefreshToken(userId);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + ms(process.env.JWT_REFRESH_TTL ?? "7d")),
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      tenantId: true,
      tenant: { select: { id: true, name: true, slug: true, planTier: true } },
    },
  });

  return { accessToken, refreshToken, user };
}
