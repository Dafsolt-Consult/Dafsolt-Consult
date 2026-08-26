import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { credentialsForTenantSlug } from "../core-sync-credentials/core-sync-credentials.service";

/**
 * Outbound, one-way sync of Fee invoices/payments into dafsolt-core's
 * General Ledger — the second pilot of that primitive (PMS's Folio was
 * the first, see dbos_industry_module_program memory). School Manager's
 * own Invoice.status/amountPaid bookkeeping stays completely
 * authoritative; this is a genuinely-double-entry-accounted mirror,
 * additive only.
 *
 * Deliberately duplicates hr-sync.service.ts's token-cache/login/refresh
 * logic rather than sharing it (own in-memory Map), same blast-radius-
 * isolation rationale every sync service in this fleet already uses.
 *
 * DELIBERATE SCOPING DECISION, different from PMS's pilot: this does
 * NOT reuse env.dafsoltCoreHrSyncTenants. That map already includes
 * royal-executive (Royal Executive Model School's real fee/student
 * data) — a real-money-adjacent tenant that needs its own explicit
 * go-ahead, same discipline the HR/Notifications rollouts used
 * (E3 -> E3b -> E4 -> E5, each real-data tenant gated separately). This
 * pilot has its OWN, narrower credential map
 * (DAFSOLT_CORE_LEDGER_SYNC_TENANTS). Since sync credentials became
 * auto-provisioned (2026-08-26), the allowlist stays the gate while
 * credential RESOLUTION prefers a delivered core_sync_credentials row
 * over the static env entry — enrolling a school still means adding its
 * slug to that env var, never happens implicitly. Extending to
 * royal-executive remains a separate future decision requiring its own
 * go-ahead, never by widening this to reuse the HR map.
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

interface ChartOfAccounts {
  cash: string;
  feesReceivable: string;
  feeRevenue: string;
}

const CHART_DEFINITIONS: { key: keyof ChartOfAccounts; code: string; name: string; type: string }[] = [
  { key: "cash", code: "1000", name: "Cash", type: "ASSET" },
  { key: "feesReceivable", code: "1100", name: "Fees Receivable", type: "ASSET" },
  { key: "feeRevenue", code: "4000", name: "Fee Revenue", type: "INCOME" },
];

const tokensByTenant = new Map<string, CoreTokens>();
const chartByTenant = new Map<string, ChartOfAccounts>();

export async function syncInvoice(tenantId: string, invoiceId: string): Promise<void> {
  try {
    await runInvoice(tenantId, invoiceId);
  } catch (err) {
    console.warn(`[ledger-sync] invoice sync failed for ${invoiceId}:`, err instanceof Error ? err.message : err);
  }
}

export async function syncPayment(tenantId: string, paymentId: string): Promise<void> {
  try {
    await runPayment(tenantId, paymentId);
  } catch (err) {
    console.warn(`[ledger-sync] payment sync failed for ${paymentId}:`, err instanceof Error ? err.message : err);
  }
}

async function runInvoice(tenantId: string, invoiceId: string): Promise<void> {
  const [token, chart] = await prepare(tenantId);
  if (!token || !chart) return;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.amount <= 0) return;

  await post(token, {
    type: "student_invoice",
    description: `Invoice ${invoice.id}`,
    valueDate: invoice.createdAt.toISOString().slice(0, 10),
    idempotencyKey: `edu-invoice-${invoice.id}`,
    lines: [
      { accountId: chart.feesReceivable, direction: "DEBIT", amountMinor: invoice.amount, currency: "NGN" },
      { accountId: chart.feeRevenue, direction: "CREDIT", amountMinor: invoice.amount, currency: "NGN" },
    ],
  });
}

async function runPayment(tenantId: string, paymentId: string): Promise<void> {
  const [token, chart] = await prepare(tenantId);
  if (!token || !chart) return;

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.amount <= 0) return;

  // Cash in (debit, asset increases), student owes less (credit, asset
  // decreases) — same direction as PMS's LedgerSyncService::runPayment().
  await post(token, {
    type: "student_payment",
    description: `Payment (${payment.method})`,
    valueDate: payment.paidAt.toISOString().slice(0, 10),
    idempotencyKey: `edu-payment-${payment.id}`,
    lines: [
      { accountId: chart.cash, direction: "DEBIT", amountMinor: payment.amount, currency: "NGN" },
      { accountId: chart.feesReceivable, direction: "CREDIT", amountMinor: payment.amount, currency: "NGN" },
    ],
  });
}

async function prepare(tenantId: string): Promise<[string | null, ChartOfAccounts | null]> {
  if (!env.dafsoltCoreLedgerSyncEnabled) return [null, null];

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
  if (!tenant) return [null, null];

  // Explicit per-tenant gate FIRST, unchanged (reaffirmed 2026-08-26 when
  // sync credentials became auto-provisioned): fee-posting still requires
  // the school to be present in DAFSOLT_CORE_LEDGER_SYNC_TENANTS — a
  // delivered credential alone never switches it on. This map exists
  // precisely so royal-executive's real fee data can't be enrolled
  // implicitly.
  if (!(tenant.slug in env.dafsoltCoreLedgerSyncTenants)) return [null, null];

  // Gate passed: a delivered (auto-provisioned) credential wins over the
  // map entry's static ones.
  const credentials = (await credentialsForTenantSlug(tenant.slug)) ?? env.dafsoltCoreLedgerSyncTenants[tenant.slug];

  const token = await getAccessToken(tenant.slug, credentials);
  if (!token) return [null, null];

  const chart = await ensureChartOfAccounts(tenant.slug, token);
  return [token, chart];
}

async function post(token: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${CORE_API_BASE_URL}/ledger/postings`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Core responded ${res.status}: ${await res.text()}`);
}

async function ensureChartOfAccounts(tenantSlug: string, token: string): Promise<ChartOfAccounts | null> {
  const cached = chartByTenant.get(tenantSlug);
  if (cached) return cached;

  const listRes = await fetch(`${CORE_API_BASE_URL}/ledger/accounts`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!listRes.ok) {
    console.warn(`[ledger-sync] could not list accounts for tenant "${tenantSlug}"`);
    return null;
  }
  const { accounts } = (await listRes.json()) as { accounts: { id: string; code: string }[] };
  const byCode = new Map(accounts.map((a) => [a.code, a.id]));

  const result: Partial<ChartOfAccounts> = {};
  for (const def of CHART_DEFINITIONS) {
    const existingId = byCode.get(def.code);
    if (existingId) {
      result[def.key] = existingId;
      continue;
    }

    const createRes = await fetch(`${CORE_API_BASE_URL}/ledger/accounts`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: def.code, name: def.name, type: def.type }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (createRes.status === 409) {
      // Concurrent provisioning — refetch rather than fail.
      const refetch = await fetch(`${CORE_API_BASE_URL}/ledger/accounts`, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const { accounts: refetched } = (await refetch.json()) as { accounts: { id: string; code: string }[] };
      const refetchedId = new Map(refetched.map((a) => [a.code, a.id])).get(def.code);
      if (refetchedId) {
        result[def.key] = refetchedId;
        continue;
      }
    }

    if (!createRes.ok) {
      console.warn(`[ledger-sync] could not provision account "${def.code}" for tenant "${tenantSlug}"`);
      return null;
    }
    const created = (await createRes.json()) as { id: string };
    result[def.key] = created.id;
  }

  const chart = result as ChartOfAccounts;
  chartByTenant.set(tenantSlug, chart);
  return chart;
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
    console.warn(`[ledger-sync] login failed for tenant "${tenantSlug}" with status ${res.status}`);
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
