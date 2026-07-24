import { prisma } from "./config/prisma";
import { env } from "./config/env";
import { hashPassword } from "./utils/password";

/** Ensures a first PlatformAdmin (role OWNER) exists, created from
 * SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD on first boot only if the
 * platform_admins table is completely empty. Unlike the old SUPER_ADMIN
 * bootstrap this never falls back to a default password — if the env vars
 * aren't set, it skips silently and logs a warning, since a hardcoded
 * default password on a live deployment is a real vulnerability, not a
 * convenience. Once at least one PlatformAdmin exists, further admins are
 * created via the OWNER-only POST /api/platform/admins endpoint instead. */
export async function ensurePlatformOwner() {
  const existingCount = await prisma.platformAdmin.count();
  if (existingCount > 0) return;

  if (!env.superAdminEmail || !env.superAdminPassword) {
    console.warn(
      "No platform admins exist and SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD are unset — " +
        "skipping bootstrap. Set both env vars and restart to create the first OWNER account."
    );
    return;
  }

  const passwordHash = await hashPassword(env.superAdminPassword);
  await prisma.platformAdmin.create({
    data: {
      email: env.superAdminEmail,
      passwordHash,
      role: "OWNER",
      firstName: "Platform",
      lastName: "Admin",
    },
  });

  console.log(`Created platform admin (OWNER) account: ${env.superAdminEmail}`);
}
