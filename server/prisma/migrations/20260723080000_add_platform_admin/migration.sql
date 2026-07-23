-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('OWNER', 'SUPPORT');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "platformAdminId" TEXT;

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_refresh_tokens" (
    "id" TEXT NOT NULL,
    "platformAdminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE INDEX "platform_refresh_tokens_platformAdminId_idx" ON "platform_refresh_tokens"("platformAdminId");

-- CreateIndex
CREATE INDEX "audit_logs_platformAdminId_createdAt_idx" ON "audit_logs"("platformAdminId", "createdAt");

-- AddForeignKey
ALTER TABLE "platform_refresh_tokens" ADD CONSTRAINT "platform_refresh_tokens_platformAdminId_fkey" FOREIGN KEY ("platformAdminId") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_platformAdminId_fkey" FOREIGN KEY ("platformAdminId") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data migration: move the legacy bootstrap SUPER_ADMIN user (if any) into
-- platform_admins as an OWNER, reusing its existing bcrypt password hash
-- (utils/password.ts is a plain bcrypt wrapper, no rehash needed). Then
-- deactivate the old row so it can no longer authenticate via the tenant
-- /api/auth/login path. No-op (0 rows) on a database with no such user.
INSERT INTO "platform_admins" (id, email, "passwordHash", role, "isActive", "firstName", "lastName", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, email, "passwordHash", 'OWNER', true, "firstName", "lastName", "createdAt", now()
FROM "users" WHERE role = 'SUPER_ADMIN';

UPDATE "users" SET "isActive" = false WHERE role = 'SUPER_ADMIN';
