import { createPublicKey, JsonWebKey } from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { enrollmentTrend, attendanceTrend, feeCollectionByTerm } from "../analytics/analytics.service";

/**
 * Phase 3 of the Industry-Adaptive Module Program: School Manager's
 * dashboard-summary pilot for Gateway's unified dashboard — same
 * fixed-envelope contract Kitchen ERP's pilot established (see
 * dbos_industry_module_program memory). Deliberately duplicates
 * sso.service.ts's JWKS-verify/email-match logic rather than sharing it
 * (own module-level cache, own lookup) — same blast-radius-isolation
 * rationale hr-sync/notifications-sync already use in this codebase: a
 * bug here can never touch the real login path. Read-only by
 * construction — no session is ever issued, unlike sso.service.ts's
 * callback().
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

export interface DashboardHeadlineStat {
  label: string;
  value: string;
}

export interface DashboardList {
  title: string;
  items: string[];
}

export interface DashboardSummary {
  product: string;
  tenantName: string;
  headline: DashboardHeadlineStat[];
  lists: DashboardList[];
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

async function verifyCoreToken(token: string): Promise<CorePayload> {
  const kid = jwt.decode(token, { complete: true })?.header.kid;

  const jwks = await getJwks();
  const signingKey = findSigningKey(jwks, kid);
  const keyObject = createPublicKey({ key: signingKey, format: "jwk" });

  return jwt.verify(token, keyObject, { algorithms: ["RS256"] }) as CorePayload;
}

export async function summary(token: string): Promise<DashboardSummary> {
  if (!env.dafsoltCoreSsoEnabled) {
    throw ApiError.notFound();
  }

  let payload: CorePayload;
  try {
    payload = await verifyCoreToken(token);
  } catch (err) {
    console.warn(
      "[dashboard-summary] rejected: JWKS fetch or token verification failed:",
      err instanceof Error ? err.message : err
    );
    throw ApiError.unauthorized(GENERIC_ERROR);
  }

  if (payload.iss !== CORE_ISSUER || payload.type !== "access" || typeof payload.email !== "string" || !payload.email) {
    console.warn("[dashboard-summary] rejected: unexpected claims", { iss: payload.iss, type: payload.type });
    throw ApiError.unauthorized(GENERIC_ERROR);
  }

  const email = payload.email;

  // No auto-provisioning, same as sso.service.ts — a Core identity only
  // ever reads data for an already-existing, active School Manager
  // account with a tenant.
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || !user.tenantId) {
    console.warn(`[dashboard-summary] rejected: no active tenant-scoped account for email ${email}`);
    throw ApiError.unauthorized("No School Manager account found for this email.");
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) {
    throw ApiError.unauthorized("No School Manager account found for this email.");
  }

  // Reuses analytics.service.ts's existing aggregates as-is, same pattern
  // as Kitchen ERP's pilot reusing FinancialsService/InventoryService —
  // no new business logic written here, just a read-only rollup.
  const [enrollment, attendance, feeCollection] = await Promise.all([
    enrollmentTrend(user.tenantId),
    attendanceTrend(user.tenantId),
    feeCollectionByTerm(user.tenantId),
  ]);

  const currentEnrollment = enrollment.length > 0 ? enrollment[enrollment.length - 1].count : 0;
  const recentAttendance = attendance.length > 0 ? attendance[attendance.length - 1] : null;
  const totalBilled = feeCollection.reduce((sum, term) => sum + term.billed, 0);
  const totalPaid = feeCollection.reduce((sum, term) => sum + term.paid, 0);
  const feeRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 1000) / 10 : null;

  return {
    product: "SCHOOL_MANAGER",
    tenantName: tenant.name,
    headline: [
      { label: "Enrolled students", value: String(currentEnrollment) },
      { label: "Attendance", value: recentAttendance ? `${recentAttendance.rate}%` : "No data yet" },
      { label: "Fees collected", value: feeRate !== null ? `${feeRate}%` : "No data yet" },
    ],
    lists: [],
  };
}
