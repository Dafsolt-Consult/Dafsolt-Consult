import { prisma } from "../../config/prisma";
import { env } from "../../config/env";

/**
 * Outbound email notifications via dafsolt-core's shared Resend-backed
 * `POST /notifications` (Phase N pilot, third product after Kitchen ERP
 * and PMS — see dbos_core_v03_expansion_reconciliation memory).
 *
 * Sibling to hr-sync.service.ts, not a shared abstraction — deliberately
 * duplicates its token-cache/login/refresh logic so a notifications-path
 * failure can never affect HR sync's already-verified production
 * behavior, and vice versa. Reuses the SAME
 * `env.dafsoltCoreHrSyncTenants` credential map as HR sync — it's
 * genuinely the same per-tenant Core sync user, just also calling a
 * different Core endpoint. Gated by its own
 * `dafsoltCoreNotifyEnabled` flag, own module-level token cache (never
 * shares a cached token with hr-sync.service.ts, even though both would
 * log in with identical credentials).
 *
 * sendWelcome() never throws — callers on the real staff-write path call
 * it without awaiting; a Core/Resend outage must never affect that write.
 * Unlike PMS, School Manager's own staff-creation flow sends no email of
 * its own today (the admin sets the new staff member's password directly,
 * communicated out-of-band) — so this is a clean hook, no duplicate-email
 * overlap to reason about.
 */

const CORE_API_BASE_URL = "https://id.dafsolt.cloud/core-api";
const REQUEST_TIMEOUT_MS = 5000;

export interface SendWelcomeInput {
  email: string;
  recipientName?: string;
  loginUrl: string;
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

// Module-level, in-process cache, deliberately separate from hr-sync's own
// tokensByTenant map — see file header.
const tokensByTenant = new Map<string, CoreTokens>();

export async function sendWelcome(tenantId: string, input: SendWelcomeInput): Promise<void> {
  try {
    await run(tenantId, "welcome", input);
  } catch (err) {
    console.warn(`[notifications-sync] send failed for ${input.email}:`, err instanceof Error ? err.message : err);
  }
}

// Distinct template/copy from sendWelcome above — for the tenant owner's
// own registration (a new school onboarding), not a staff member being
// added to an existing school. Same mechanism, different message, per the
// Notifications rollout plan. Will legitimately no-op for most real
// self-serve sign-ups (a brand-new tenant is never already in the
// dafsoltCoreHrSyncTenants credential map) — same posture as every other
// no-op case here, not a bug.
export async function sendTenantWelcome(tenantId: string, input: SendWelcomeInput): Promise<void> {
  try {
    await run(tenantId, "tenant-welcome", input);
  } catch (err) {
    console.warn(`[notifications-sync] send failed for ${input.email}:`, err instanceof Error ? err.message : err);
  }
}

async function run(tenantId: string, template: string, input: SendWelcomeInput): Promise<void> {
  if (!env.dafsoltCoreNotifyEnabled) return;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
  if (!tenant) return;

  const credentials = getCredentialsFor(tenant.slug);
  if (!credentials) return;

  const token = await getAccessToken(tenant.slug, credentials);
  if (!token) return;

  const res = await fetch(`${CORE_API_BASE_URL}/notifications`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      email: input.email,
      channel: "email",
      template,
      data: { recipientName: input.recipientName, loginUrl: input.loginUrl },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Core responded ${res.status}`);

  const body = (await res.json()) as { sent: boolean; reason?: string };
  if (!body.sent) {
    console.log(`[notifications-sync] no-op for ${input.email}: ${body.reason ?? "not sent"}`);
  }
}

function getCredentialsFor(tenantSlug: string): TenantCredentials | null {
  return env.dafsoltCoreHrSyncTenants[tenantSlug] ?? null;
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
    console.warn(`[notifications-sync] login failed for tenant "${tenantSlug}" with status ${res.status}`);
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
