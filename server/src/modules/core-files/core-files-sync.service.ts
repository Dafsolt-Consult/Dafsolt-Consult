import { prisma } from "../../config/prisma";
import { env } from "../../config/env";

/**
 * Proxy to dafsolt-core's Phase F file storage API (POST /files/upload-url,
 * GET /files/:id) — first real product consumer of that API (see
 * dbos_core_v03_expansion_reconciliation / dazzling-shimmying-jellyfish
 * memory; Echo Chamber was excluded from all Core consideration).
 *
 * Unlike hr-sync/notifications-sync, Core's Files API is NOT service-to-
 * service-only by design (see dafsolt-core's src/routes/files.js docblock:
 * "any authenticated user in a tenant can upload/read/delete files... no
 * role gate beyond standard tenant-scoped bearer-token auth"). School
 * Manager's real users mostly aren't individually SSO'd into Core, though
 * — most log in via School Manager's own auth, not Core SSO — so there is
 * no real per-user Core token available server-side for a typical
 * request. This service authenticates as the SAME per-tenant Core sync
 * user already used for HR sync/Notifications instead: every file this
 * app uploads is attributed to that one service identity in Core's
 * `FileObject.uploadedByUserId`, not the individual teacher/librarian who
 * clicked "upload" — an accepted simplification, not a bug, matching the
 * same "one service identity per tenant" posture HR sync already uses.
 *
 * Sibling to hr-sync.service.ts/notifications-sync.service.ts, not a
 * shared abstraction — deliberately duplicates their token-cache/login/
 * refresh logic so a file-storage failure can never affect either
 * already-verified path, and vice versa.
 */

const CORE_API_BASE_URL = "https://id.dafsolt.cloud/core-api";
const REQUEST_TIMEOUT_MS = 10_000; // file APIs can be slower than a plain JSON call

export interface UploadUrlRequest {
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export interface UploadUrlResult {
  uploadUrl: string;
  fileId: string;
}

export interface DownloadUrlResult {
  downloadUrl: string;
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

// Module-level, in-process cache, deliberately separate from hr-sync's and
// notifications-sync's own maps — see file header.
const tokensByTenant = new Map<string, CoreTokens>();

export class CoreFilesUnavailableError extends Error {}

export async function getUploadUrl(tenantId: string, input: UploadUrlRequest): Promise<UploadUrlResult> {
  const token = await requireToken(tenantId);

  const res = await fetch(`${CORE_API_BASE_URL}/files/upload-url`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new CoreFilesUnavailableError(`Core responded ${res.status}: ${body}`);
  }

  const body = (await res.json()) as { uploadUrl: string; file: { id: string } };
  return { uploadUrl: body.uploadUrl, fileId: body.file.id };
}

export async function getDownloadUrl(tenantId: string, fileId: string): Promise<DownloadUrlResult> {
  const token = await requireToken(tenantId);

  const res = await fetch(`${CORE_API_BASE_URL}/files/${encodeURIComponent(fileId)}`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new CoreFilesUnavailableError(`Core responded ${res.status}: ${body}`);
  }

  const body = (await res.json()) as { downloadUrl: string };
  return { downloadUrl: body.downloadUrl };
}

async function requireToken(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
  if (!tenant) throw new CoreFilesUnavailableError("Tenant not found");

  const credentials = env.dafsoltCoreHrSyncTenants[tenant.slug];
  if (!credentials) {
    throw new CoreFilesUnavailableError(
      `This school (${tenant.slug}) is not enrolled in Core file storage yet`
    );
  }

  const token = await getAccessToken(tenant.slug, credentials);
  if (!token) throw new CoreFilesUnavailableError("Could not authenticate with Core");
  return token;
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
    console.warn(`[core-files-sync] login failed for tenant "${tenantSlug}" with status ${res.status}`);
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
