import { prisma } from "../../config/prisma";
import { env } from "../../config/env";

/**
 * Outbound, one-way sync of Student/Guardian records into dafsolt-core's
 * Contact primitive — the first pilot of that primitive (Industry-Adaptive
 * Module Program Finding F names PMS's Guest, School Manager's
 * Student+Guardian, and TradeLoan's Member as the three candidates it was
 * built for). Student/Guardian stay completely authoritative locally;
 * Core only ever gets a mirror, tagged so the two entity types are
 * distinguishable in Core's flat Contact shape (["student"] / ["guardian"]).
 * The StudentGuardian relationship itself is never mirrored — Core's
 * Contact has nothing to represent it with, and reproducing it there would
 * be exactly the "something deeper" scope this first pilot deliberately
 * avoids.
 *
 * Deliberately duplicates ledger-sync.service.ts's token-cache/login/
 * refresh logic rather than sharing it (own in-memory Map), same
 * blast-radius-isolation rationale every sync service in this fleet uses.
 *
 * DELIBERATE SCOPING DECISION, same as ledger-sync: this does NOT reuse
 * env.dafsoltCoreHrSyncTenants (already includes royal-executive). This
 * pilot has its OWN, narrower credential map
 * (DAFSOLT_CORE_CONTACT_SYNC_TENANTS), scoped to just the empty trial
 * tenant "blosom" for now. Extending to royal-executive (real student/
 * guardian PII) is a separate future decision.
 *
 * Core's POST /contacts always creates — there's no upsert-by-external-id
 * — so Student.coreContactId/Guardian.coreContactId (set on first sync)
 * is what makes repeat syncs idempotent: present -> PATCH, absent -> POST
 * then store the id.
 */

const CORE_API_BASE_URL = "https://id.dafsolt.cloud/core-api";
const REQUEST_TIMEOUT_MS = 5000;

interface TenantCredentials {
  email: string;
  password: string;
}

interface CoreTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const tokensByTenant = new Map<string, CoreTokens>();

export async function syncStudent(tenantId: string, studentId: string): Promise<void> {
  try {
    await runStudent(tenantId, studentId);
  } catch (err) {
    console.warn(`[contact-sync] student sync failed for ${studentId}:`, err instanceof Error ? err.message : err);
  }
}

export async function syncGuardian(tenantId: string, guardianId: string): Promise<void> {
  try {
    await runGuardian(tenantId, guardianId);
  } catch (err) {
    console.warn(`[contact-sync] guardian sync failed for ${guardianId}:`, err instanceof Error ? err.message : err);
  }
}

async function runStudent(tenantId: string, studentId: string): Promise<void> {
  const token = await prepare(tenantId);
  if (!token) return;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
  });
  if (!student) return;

  const payload = {
    name: `${student.user.firstName} ${student.user.lastName}`.trim(),
    email: student.user.email || undefined,
    phone: student.user.phone || undefined,
    tags: ["student"],
  };

  if (student.coreContactId) {
    await patchContact(token, student.coreContactId, payload);
    return;
  }
  const id = await postContact(token, payload);
  await prisma.student.update({ where: { id: studentId }, data: { coreContactId: id } });
}

async function runGuardian(tenantId: string, guardianId: string): Promise<void> {
  const token = await prepare(tenantId);
  if (!token) return;

  const guardian = await prisma.guardian.findUnique({ where: { id: guardianId } });
  if (!guardian) return;

  const payload = {
    name: `${guardian.firstName} ${guardian.lastName}`.trim(),
    email: guardian.email || undefined,
    phone: guardian.phone || undefined,
    tags: ["guardian"],
  };

  if (guardian.coreContactId) {
    await patchContact(token, guardian.coreContactId, payload);
    return;
  }
  const id = await postContact(token, payload);
  await prisma.guardian.update({ where: { id: guardianId }, data: { coreContactId: id } });
}

async function prepare(tenantId: string): Promise<string | null> {
  if (!env.dafsoltCoreContactSyncEnabled) return null;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
  if (!tenant) return null;

  const credentials = env.dafsoltCoreContactSyncTenants[tenant.slug];
  if (!credentials) return null;

  return getAccessToken(tenant.slug, credentials);
}

async function postContact(token: string, payload: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${CORE_API_BASE_URL}/contacts`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Core responded ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function patchContact(token: string, contactId: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${CORE_API_BASE_URL}/contacts/${contactId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Core responded ${res.status}: ${await res.text()}`);
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
    console.warn(`[contact-sync] login failed for tenant "${tenantSlug}" with status ${res.status}`);
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
    tokensByTenant.delete(tenantSlug);
    return null;
  }
  const body = (await res.json()) as { accessToken: string; refreshToken: string };
  storeTokens(tenantSlug, body.accessToken, body.refreshToken);
  return body.accessToken;
}

function storeTokens(tenantSlug: string, accessToken: string, refreshToken: string): void {
  const payload = decodeJwtPayload(accessToken);
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
