import jwt, { SignOptions } from "jsonwebtoken";
import { PlatformRole } from "@prisma/client";
import { env } from "../config/env";

// Deliberately signed with a separate secret (JWT_PLATFORM_SECRET) from
// tenant tokens (utils/jwt.ts) — a leaked tenant secret can't forge a
// platform-admin token, and vice versa.

export interface PlatformAccessTokenPayload {
  sub: string; // platformAdminId
  role: PlatformRole;
}

export function signPlatformAccessToken(payload: PlatformAccessTokenPayload): string {
  return jwt.sign(payload, env.jwtPlatformSecret, {
    expiresIn: env.jwtAccessTtl,
  } as SignOptions);
}

export function signPlatformRefreshToken(platformAdminId: string): string {
  return jwt.sign({ sub: platformAdminId }, env.jwtPlatformSecret, {
    expiresIn: env.jwtRefreshTtl,
  } as SignOptions);
}

export function verifyPlatformAccessToken(token: string): PlatformAccessTokenPayload {
  return jwt.verify(token, env.jwtPlatformSecret) as PlatformAccessTokenPayload;
}

export function verifyPlatformRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.jwtPlatformSecret) as { sub: string };
}
