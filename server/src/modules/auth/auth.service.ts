import { randomBytes } from "crypto";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { comparePassword, hashPassword } from "../../utils/password";
import { hashToken } from "../../utils/hashToken";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { LoginInput, OnboardSchoolInput } from "./auth.schema";
import ms from "../../utils/ms";
import { slugify } from "../../utils/slugify";
import { sendEmail } from "../../utils/email";
import { PLAN_DEFAULTS } from "../../utils/planLimits";
import * as notificationsSync from "../notifications-sync/notifications-sync.service";

const TRIAL_DAYS = 30;
const RESET_TOKEN_TTL_MS = ms("1h");

/**
 * A brand-new tenant previously started with zero AcademicSession/Term
 * rows — if an admin's first action was marking a session current before
 * adding terms (a completely normal thing to do), every term-scoped
 * feature would land on the safe-fallback "no terms anywhere" case
 * instead of a working default. currentSessionId()'s own fallback chain
 * (client/src/hooks/useAcademics.ts) already degrades gracefully rather
 * than crashing, but a real default is better than an empty first
 * screen. Nigerian/West African school year convention: starts
 * September. If onboarding happens Jan-Aug, that academic year already
 * started the previous September.
 */
function defaultAcademicYearStart(now: Date): number {
  return now.getUTCMonth() >= 8 /* September (0-indexed) */ ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

async function seedDefaultAcademicSession(tenantId: string, now: Date): Promise<void> {
  const yearStart = defaultAcademicYearStart(now);
  const yearEnd = yearStart + 1;

  await prisma.academicSession.create({
    data: {
      tenantId,
      name: `${yearStart}/${yearEnd}`,
      startDate: new Date(Date.UTC(yearStart, 8, 1)),
      endDate: new Date(Date.UTC(yearEnd, 7, 1)),
      isCurrent: true,
      terms: {
        create: [
          {
            tenantId,
            name: "First Term",
            startDate: new Date(Date.UTC(yearStart, 8, 1)),
            endDate: new Date(Date.UTC(yearStart, 11, 20)),
            isCurrent: true,
          },
          {
            tenantId,
            name: "Second Term",
            startDate: new Date(Date.UTC(yearEnd, 0, 5)),
            endDate: new Date(Date.UTC(yearEnd, 3, 5)),
          },
          {
            tenantId,
            name: "Third Term",
            startDate: new Date(Date.UTC(yearEnd, 3, 25)),
            endDate: new Date(Date.UTC(yearEnd, 7, 1)),
          },
        ],
      },
    },
  });
}

async function resolveUniqueSlug(requested: string | undefined, schoolName: string) {
  const base = slugify(requested || schoolName) || "school";

  const existing = await prisma.tenant.findUnique({ where: { slug: base } });
  if (!existing) return base;

  if (requested) throw ApiError.conflict("This school URL is already taken");

  for (let suffix = 2; suffix < 1000; suffix++) {
    const candidate = `${base}-${suffix}`;
    const taken = await prisma.tenant.findUnique({ where: { slug: candidate } });
    if (!taken) return candidate;
  }
  throw ApiError.conflict("Could not generate a unique school URL, please provide one");
}

export async function onboardSchool(input: OnboardSchoolInput) {
  const slug = await resolveUniqueSlug(input.slug || undefined, input.schoolName);

  const existingEmail = await prisma.user.findUnique({ where: { email: input.adminEmail } });
  if (existingEmail) throw ApiError.conflict("An account with this email already exists");

  const passwordHash = await hashPassword(input.adminPassword);
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const planTier = input.planTier ?? "STARTER";
  const { maxStudents, maxStaff } = PLAN_DEFAULTS[planTier];

  const tenant = await prisma.tenant.create({
    data: {
      name: input.schoolName,
      slug,
      address: input.address || undefined,
      landmark: input.landmark || undefined,
      state: input.state,
      country: input.country,
      currency: input.currency,
      trialEndsAt,
      planTier,
      maxStudents,
      maxStaff,
      users: {
        create: {
          email: input.adminEmail,
          passwordHash,
          role: "SCHOOL_ADMIN",
          firstName: input.adminFirstName,
          lastName: input.adminLastName,
          phone: input.adminPhone,
        },
      },
    },
    include: { users: true },
  });

  const adminUser = tenant.users[0];

  // A missing default session shouldn't fail registration — the tenant
  // and admin account are already committed above, and every term-scoped
  // feature still degrades gracefully without one (currentSessionId()'s
  // fallback chain). Worst case on failure here: the school ends up in
  // exactly the pre-fix state, not a new/worse one.
  try {
    await seedDefaultAcademicSession(tenant.id, new Date());
  } catch (err) {
    console.warn(`[onboardSchool] failed to seed a default academic session for tenant ${tenant.id}:`, err);
  }

  // Same fire-and-forget posture as everywhere else this fires: a Core
  // outage must never affect onboarding. Distinct template from staff
  // welcome — this is the school's own owner account, not a staff member
  // being added.
  void notificationsSync.sendTenantWelcome(tenant.id, {
    email: adminUser.email,
    recipientName: `${adminUser.firstName} ${adminUser.lastName}`,
    loginUrl: `${env.clientUrl}/login`,
  });

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
 * tenant role — SCHOOL_ADMIN, TEACHER, STUDENT, PARENT, LIBRARIAN,
 * ACCOUNTANT, etc. — since it operates on the shared User model. Platform
 * admins are a separate model (see modules/platform) with their own
 * OWNER-driven reset instead of a self-service email flow. */
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

  const result = await sendEmail(
    user.email,
    "Reset your Dafsolt BOS password",
    `Hi ${user.firstName}, use this link to reset your password (expires in 1 hour): ${resetLink}`
  );

  // Falls back to a server log only when the email wasn't actually sent
  // (SMTP not configured, or the send itself failed) so an operator with
  // server access can still relay the link manually — see
  // src/utils/email.ts. The raw token is never returned via the API or
  // persisted anywhere other than its hash.
  if (!result.ok) {
    console.log(`[password reset] ${user.role} <${user.email}> requested a reset (${result.reason}): ${resetLink}`);
  }
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken);
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    throw ApiError.badRequest("This reset link is invalid or has expired");
  }

  const passwordHash = await hashPassword(newPassword);

  const resetUser = await prisma.user.findUniqueOrThrow({ where: { id: resetToken.userId } });

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    // Force re-login everywhere: a leaked/guessed old session shouldn't
    // survive a password reset.
    prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: resetUser.tenantId,
        userId: resetUser.id,
        action: "PASSWORD_RESET",
        entityType: "User",
        entityId: resetUser.id,
      },
    }),
  ]);
}

export async function issueSession(userId: string, tenantId: string | null, role: import("@prisma/client").UserRole) {
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
