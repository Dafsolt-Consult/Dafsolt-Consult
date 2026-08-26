import { createPublicKey, JsonWebKey } from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { decryptSecret, encryptSecret } from "../../utils/secret-box";

/**
 * Stores and resolves the per-tenant dafsolt-core sync credential that
 * Core's provisioning flow delivers (port of Kitchen ERP's
 * core-sync-credentials service — same contract). Deliberately
 * duplicates sso.service.ts's JWKS-verify logic rather than sharing it
 * (own module-level cache) — same blast-radius-isolation rationale as
 * every sibling in this codebase: a bug here can never touch the real
 * login path.
 *
 * Two claim rules differ from the SSO path on purpose: the token type
 * must be "provisioning", never "access" (a browser-login token must
 * never be accepted here), and both the tenantSlug and module claims are
 * cross-checked against the delivered body — the signature covers only
 * the token's own claims, not the payload alongside it.
 */

const JWKS_URL = "https://id.dafsolt.cloud/core-api/auth/jwks.json";
const CORE_ISSUER = "dafsolt-core";
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const GENERIC_ERROR = "Credential delivery rejected.";

interface Jwks {
  keys: JsonWebKey[];
}

export interface CoreProvisioningPayload extends JwtPayload {
  type?: string;
  tenantId?: string;
  tenantSlug?: string;
  module?: string;
}

export interface TenantCredentials {
  email: string;
  password: string;
}

let jwksCache: { jwks: Jwks; fetchedAt: number } | null = null;

async function getJwks(): Promise<Jwks> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.jwks;
  }

  const res = await fetch(JWKS_URL);
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

async function verifyCoreToken(token: string): Promise<CoreProvisioningPayload> {
  const kid = jwt.decode(token, { complete: true })?.header.kid;

  const jwks = await getJwks();
  const signingKey = findSigningKey(jwks, kid);
  const keyObject = createPublicKey({ key: signingKey, format: "jwk" });

  return jwt.verify(token, keyObject, { algorithms: ["RS256"] }) as CoreProvisioningPayload;
}

export async function receiveSyncCredential(
  bearer: string | null,
  body: { tenantSlug: string; module: string; email: string; password: string }
): Promise<void> {
  if (!bearer || !body.tenantSlug) {
    throw ApiError.unauthorized(GENERIC_ERROR);
  }

  // This endpoint stores School Manager's own sync credentials only — a
  // valid provisioning token for another product must not land here.
  if (body.module !== "SCHOOL_MANAGER") {
    throw ApiError.unauthorized("This endpoint only accepts SCHOOL_MANAGER credentials.");
  }

  let payload: CoreProvisioningPayload;
  try {
    payload = await verifyCoreToken(bearer);
  } catch (err) {
    console.warn(
      "[core-sync-credentials] rejected: JWKS fetch or token verification failed:",
      err instanceof Error ? err.message : err
    );
    throw ApiError.unauthorized(GENERIC_ERROR);
  }

  if (
    payload.iss !== CORE_ISSUER ||
    payload.type !== "provisioning" ||
    payload.tenantSlug !== body.tenantSlug ||
    payload.module !== body.module
  ) {
    console.warn("[core-sync-credentials] rejected: unexpected claims", { iss: payload.iss, type: payload.type });
    throw ApiError.unauthorized(GENERIC_ERROR);
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug }, select: { id: true } });
  if (!tenant) {
    console.warn(`[core-sync-credentials] rejected: unknown tenant slug ${body.tenantSlug}`);
    throw ApiError.notFound("Unknown tenant.");
  }

  const passwordCiphertext = encryptSecret(body.password);
  await prisma.coreSyncCredential.upsert({
    where: { tenantId: tenant.id },
    create: { tenantId: tenant.id, email: body.email, passwordCiphertext },
    update: { email: body.email, passwordCiphertext },
  });
}

/**
 * The outbound sync services' lookup: returns the stored credentials for
 * auto-provisioned tenants, or null when none was ever delivered (and,
 * like every reader here, when decryption fails — e.g. a rotated key
 * must degrade to "no sync", never break a write).
 */
export async function credentialsForTenantSlug(tenantSlug: string): Promise<TenantCredentials | null> {
  let credential: { email: string; passwordCiphertext: string } | null;
  try {
    credential = await prisma.coreSyncCredential.findFirst({
      where: { tenant: { slug: tenantSlug } },
      select: { email: true, passwordCiphertext: true },
    });
  } catch {
    return null;
  }
  if (!credential) return null;

  try {
    return { email: credential.email, password: decryptSecret(credential.passwordCiphertext) };
  } catch (err) {
    console.error(
      `[core-sync-credentials] decrypt failed for tenant "${tenantSlug}" — falling back to env config:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
