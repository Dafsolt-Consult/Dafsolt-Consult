import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

// Deliberately signed with its own secret (JWT_KIOSK_SECRET), separate from
// both tenant tokens (utils/jwt.ts) and platform-admin tokens
// (utils/platformJwt.ts) — a leaked kiosk secret can only ever forge a
// kiosk session (exam-taking only, see middleware/kioskAuth.ts), never a
// real student account or anything else. `kind` is a redundant-but-cheap
// extra guard against ever being confused with AccessTokenPayload even in a
// future refactor mistake.

export interface KioskAccessTokenPayload {
  sub: string; // studentId
  tenantId: string;
  kind: "kiosk";
}

export function signKioskAccessToken(payload: Omit<KioskAccessTokenPayload, "kind">): string {
  return jwt.sign({ ...payload, kind: "kiosk" }, env.jwtKioskSecret, {
    expiresIn: env.jwtKioskTtl,
  } as SignOptions);
}

export function verifyKioskAccessToken(token: string): KioskAccessTokenPayload {
  return jwt.verify(token, env.jwtKioskSecret) as KioskAccessTokenPayload;
}
