import { createPublicKey, JsonWebKey } from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { issueSession } from "../auth/auth.service";

/**
 * Accepts a dafsolt-core (id.dafsolt.cloud) issued identity as an
 * additive alternate login path for School Manager, entirely on top of the
 * existing password-login flow (modules/auth). Pilot scope, matching PMS's
 * P3 integration: no auto-provisioning — a Core identity only logs someone
 * in if a School Manager account with a matching email already exists.
 */

const JWKS_URL = "https://id.dafsolt.cloud/core-api/auth/jwks.json";
const CORE_ISSUER = "dafsolt-core";
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const GENERIC_ERROR = "Sign-in link expired or invalid.";

interface Jwks {
  keys: JsonWebKey[];
}

interface CorePayload extends JwtPayload {
  email?: string;
  type?: string;
}

let jwksCache: { jwks: Jwks; fetchedAt: number } | null = null;

async function getJwks(): Promise<Jwks> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.jwks;
  }

  const res = await fetch(JWKS_URL);
  // Checking res.ok (and the shape below) BEFORE caching matters: a
  // transient Core outage (network error, 502) must not get cached as the
  // "current" JWKS for a full hour — the very next callback attempt should
  // retry the fetch instead of being wedged until the TTL expires.
  if (!res.ok) {
    throw new Error(`JWKS fetch failed with status ${res.status}`);
  }

  const body = (await res.json()) as Partial<Jwks>;
  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    throw new Error("JWKS response missing a usable key set");
  }

  const jwks: Jwks = { keys: body.keys };
  jwksCache = { jwks, fetchedAt: Date.now() };
  return jwks;
}

function findSigningKey(jwks: Jwks, kid: string | undefined): JsonWebKey {
  const key = kid ? jwks.keys.find((candidate) => candidate.kid === kid) : jwks.keys[0];
  if (!key) throw new Error(`No JWKS key found for kid "${kid ?? "(none)"}"`);
  return key;
}

async function verifyCoreToken(token: string): Promise<CorePayload> {
  const kid = jwt.decode(token, { complete: true })?.header.kid;

  const jwks = await getJwks();
  const signingKey = findSigningKey(jwks, kid);
  const keyObject = createPublicKey({ key: signingKey, format: "jwk" });

  return jwt.verify(token, keyObject, { algorithms: ["RS256"] }) as CorePayload;
}

export async function callback(token: string) {
  if (!env.dafsoltCoreSsoEnabled) {
    // Indistinguishable from a route that doesn't exist when the pilot flag
    // is off — same shape as a plain 404.
    throw ApiError.notFound();
  }

  let payload: CorePayload;
  try {
    payload = await verifyCoreToken(token);
  } catch (err) {
    // Any failure here — expired token, bad signature, JWKS fetch failure,
    // malformed JWT — gets the same generic response so the caller can't
    // learn which check failed. The specific reason is only logged.
    console.warn("[sso] callback rejected: JWKS fetch or token verification failed:", err instanceof Error ? err.message : err);
    throw ApiError.unauthorized(GENERIC_ERROR);
  }

  if (payload.iss !== CORE_ISSUER || payload.type !== "access" || typeof payload.email !== "string" || !payload.email) {
    console.warn("[sso] callback rejected: unexpected claims", { iss: payload.iss, type: payload.type, email: payload.email });
    throw ApiError.unauthorized(GENERIC_ERROR);
  }

  const email = payload.email;

  // No auto-provisioning — ever. A Core identity only signs someone in if a
  // matching School Manager account already exists.
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    // Deliberately the same message whether the account doesn't exist or
    // exists but is inactive, so this response can't be used to confirm an
    // account's existence — mirrors login()'s "Invalid email or password"
    // framing for the equivalent ambiguity.
    console.warn(`[sso] callback rejected: no active account for email ${email}`);
    throw ApiError.unauthorized("No School Manager account found for this email.");
  }

  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (tenant && tenant.subscriptionStatus === "CANCELED") {
      console.warn(`[sso] callback rejected: subscription canceled for email ${email}`);
      throw ApiError.forbidden("This school's subscription has been canceled");
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  console.info(`[sso] callback succeeded for email ${email}`);

  return issueSession(user.id, user.tenantId, user.role);
}
