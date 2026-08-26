import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { credentialsForTenantSlug } from "../core-sync-credentials/core-sync-credentials.service";

/**
 * Outbound, one-way sync of School Manager staff into dafsolt-core's
 * shared Employment record (Tier 1 of the shared HR track — see
 * hr_shared_core_roadmap memory / the E1 design doc). School's own
 * User/Teacher rows stay authoritative; Core is never read from.
 *
 * Authenticates as a dedicated non-human Core user via the existing
 * login/refresh flow (no new Core auth mechanism) — same mechanism
 * already proven on Kitchen ERP (E3) and PMS (E3b). `syncEmployment()`
 * never throws — callers on the real staff-write path call it without
 * awaiting; a Core failure must never affect that write.
 *
 * E6 full-rollout scope: each enrolled School Manager tenant has its OWN
 * dedicated Core tenant + sync user — Core's employment-sync lookup is
 * scoped to the calling sync user's own Core tenant, so a single shared
 * sync-user could never actually match staff outside its one Core tenant
 * anyway. `env.dafsoltCoreHrSyncTenants` is a parsed JSON map of
 * { [schoolTenantSlug]: { email, password } }; a tenant not present in
 * the map is a silent no-op, same posture as the original single-tenant
 * pilot scoping.
 */

const CORE_API_BASE_URL = "https://id.dafsolt.cloud/core-api";
const REQUEST_TIMEOUT_MS = 5000;

export interface SyncEmploymentInput {
  email: string;
  status?: "active" | "on_leave" | "terminated";
  hireDate?: string;
  jobTitle?: string;
  department?: string;
}

interface TenantCredentials {
  email: string;
  password: string;
}

interface CoreTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Module-level, in-process cache — fine here (unlike a PHP-FPM worker,
// this is a single long-running Node process), same approach as
// sso.service.ts's JWKS cache above. Keyed per tenant, since each
// enrolled tenant authenticates as a different Core user.
const tokensByTenant = new Map<string, CoreTokens>();

export async function syncEmployment(tenantId: string, input: SyncEmploymentInput): Promise<void> {
  try {
    await run(tenantId, input);
  } catch (err) {
    console.warn(`[hr-sync] sync failed for ${input.email}:`, err instanceof Error ? err.message : err);
  }
}

async function run(tenantId: string, input: SyncEmploymentInput): Promise<void> {
  if (!env.dafsoltCoreHrSyncEnabled) return;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
  if (!tenant) return;

  const credentials = await getCredentialsFor(tenant.slug);
  if (!credentials) return;

  const token = await getAccessToken(tenant.slug, credentials);
  if (!token) return;

  const res = await fetch(`${CORE_API_BASE_URL}/hr/employment-sync`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Core responded ${res.status}`);

  const body = (await res.json()) as { synced: boolean };
  if (!body.synced) {
    console.log(`[hr-sync] no-op for ${input.email}: no matching Core user yet`);
  }
}

// Store first (auto-provisioned tenants — a credential delivered by Core's
// provisioning flow to core_sync_credentials), legacy env map second.
// Same precedence every Core sync integration in this fleet now uses
// (2026-08-26).
async function getCredentialsFor(tenantSlug: string): Promise<TenantCredentials | null> {
  return (await credentialsForTenantSlug(tenantSlug)) ?? env.dafsoltCoreHrSyncTenants[tenantSlug] ?? null;
}

async function getAccessToken(tenantSlug: string, credentials: TenantCredentials): Promise<string | null> {
  const cached = tokensByTenant.get(tenantSlug);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.accessToken;
  }
  if (cached) {
    const refreshed = await refresh(tenantSlug, cached.refreshToken);
    if (refreshed) return refreshed;
  }
  return login(tenantSlug, credentials);
}

async function login(tenantSlug: string, credentials: TenantCredentials): Promise<string | null> {
  const res = await fetch(`${CORE_API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    console.warn(`[hr-sync] login failed for tenant "${tenantSlug}" with status ${res.status}`);
    return null;
  }

  const body = (await res.json()) as { accessToken: string; refreshToken: string };
  storeTokens(tenantSlug, body.accessToken, body.refreshToken);
  return body.accessToken;
}

async function refresh(tenantSlug: string, refreshToken: string): Promise<string | null> {
  const res = await fetch(`${CORE_API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    // Refresh token rotated/revoked/expired — drop the cache and let the
    // next call fall through to a fresh login instead of looping on a
    // dead token.
    tokensByTenant.delete(tenantSlug);
    return null;
  }

  const body = (await res.json()) as { accessToken: string; refreshToken: string };
  storeTokens(tenantSlug, body.accessToken, body.refreshToken);
  return body.accessToken;
}

function storeTokens(tenantSlug: string, accessToken: string, refreshToken: string): void {
  const payload = decodeJwtPayload(accessToken);
  // Signature isn't verified here — this token was just issued to us
  // directly by Core over HTTPS, not supplied by an untrusted caller; we
  // only need `exp` to know when to refresh. Refresh 60s early so a
  // request already in flight never races an expiring token.
  const expiresAt = payload?.exp ? payload.exp * 1000 - 60_000 : Date.now() + 10 * 60_000;
  tokensByTenant.set(tenantSlug, { accessToken, refreshToken, expiresAt });
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
