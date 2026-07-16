import { prisma } from "./config/prisma";
import { env } from "./config/env";
import { hashPassword } from "./utils/password";

/** Ensures a platform SUPER_ADMIN account exists, created from
 * SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD on first boot. Onboarding only ever
 * creates SCHOOL_ADMIN users, so without this there would be no way to reach
 * the platform-level Schools management screen. */
export async function ensureSuperAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: env.superAdminEmail } });
  if (existing) return;

  const passwordHash = await hashPassword(env.superAdminPassword);
  await prisma.user.create({
    data: {
      email: env.superAdminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
      firstName: "Platform",
      lastName: "Admin",
    },
  });

  console.log(`Created SUPER_ADMIN account: ${env.superAdminEmail}`);
}
