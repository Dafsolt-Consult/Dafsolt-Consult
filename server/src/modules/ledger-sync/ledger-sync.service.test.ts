import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const mockEnv: {
  dafsoltCoreLedgerSyncEnabled: boolean;
  dafsoltCoreLedgerSyncTenants: Record<string, { email: string; password: string }>;
} = {
  dafsoltCoreLedgerSyncEnabled: true,
  dafsoltCoreLedgerSyncTenants: {
    blosom: { email: "ledger-sync+blosom@example.internal", password: "sync-password-blosom" },
  },
};

const mockTenantFindUnique = vi.fn();
const mockInvoiceFindUnique = vi.fn();
const mockPaymentFindUnique = vi.fn();

vi.mock("../../config/env", () => ({ env: mockEnv }));
const mockCredentialFindFirst = vi.fn();

vi.mock("../../config/prisma", () => ({
  prisma: {
    tenant: { findUnique: mockTenantFindUnique },
    invoice: { findUnique: mockInvoiceFindUnique },
    payment: { findUnique: mockPaymentFindUnique },
    coreSyncCredential: { findFirst: mockCredentialFindFirst },
  },
}));

async function deliverStoredCredential(password: string) {
  process.env.CORE_SYNC_CREDENTIAL_KEY = Buffer.alloc(32, 11).toString("base64");
  const { encryptSecret } = await import("../../utils/secret-box");
  mockCredentialFindFirst.mockResolvedValue({
    email: "ledger-sync+stored@example.internal",
    passwordCiphertext: encryptSecret(password),
  });
}

function signAccessToken(expiresInSeconds: number) {
  return jwt.sign({ sub: "core-user-1" }, "unused-secret-just-for-exp-decode", { expiresIn: expiresInSeconds });
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body, text: async () => JSON.stringify(body) };
}

describe("ledger-sync.service", () => {
  let originalFetch: typeof global.fetch;
  let syncInvoice: (typeof import("./ledger-sync.service"))["syncInvoice"];
  let syncPayment: (typeof import("./ledger-sync.service"))["syncPayment"];

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    mockEnv.dafsoltCoreLedgerSyncEnabled = true;
    mockEnv.dafsoltCoreLedgerSyncTenants = {
      blosom: { email: "ledger-sync+blosom@example.internal", password: "sync-password-blosom" },
    };
    mockTenantFindUnique.mockReset().mockResolvedValue({ slug: "blosom" });
    mockInvoiceFindUnique.mockReset();
    mockPaymentFindUnique.mockReset();
    // No delivered credential by default — pre-existing tests exercise the
    // legacy env-map path.
    mockCredentialFindFirst.mockReset().mockResolvedValue(null);

    // Module-level Map caches (tokens + chart of accounts) — reset the
    // module registry and re-import fresh each test, same technique
    // hr-sync.service.test.ts already uses.
    vi.resetModules();
    ({ syncInvoice, syncPayment } = await import("./ledger-sync.service"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockFreshChartAndLogin() {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(jsonResponse({ accessToken: signAccessToken(900), refreshToken: "r1" })) // login
      .mockResolvedValueOnce(jsonResponse({ accounts: [] })) // list: empty
      .mockResolvedValueOnce(jsonResponse({ id: "acc-cash" })) // create cash
      .mockResolvedValueOnce(jsonResponse({ id: "acc-receivable" })) // create receivable
      .mockResolvedValueOnce(jsonResponse({ id: "acc-revenue" })) // create revenue
      .mockResolvedValueOnce(jsonResponse({ id: "tx-1" })); // posting
  }

  it("is a no-op when the feature flag is disabled", async () => {
    mockEnv.dafsoltCoreLedgerSyncEnabled = false;
    await syncInvoice("t1", "inv-1");
    expect(mockTenantFindUnique).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("is a no-op for a tenant not present in the ledger-sync credentials map, even if it's HR-sync enrolled", async () => {
    mockTenantFindUnique.mockResolvedValue({ slug: "royal-executive" }); // real HR-sync tenant, not ledger-sync
    await syncInvoice("t1", "inv-1");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("syncs an invoice as a debit to Fees Receivable and a credit to Fee Revenue", async () => {
    mockFreshChartAndLogin();
    mockInvoiceFindUnique.mockResolvedValue({
      id: "inv-1",
      amount: 500000,
      createdAt: new Date("2026-08-24T00:00:00.000Z"),
    });

    await syncInvoice("t1", "inv-1");

    const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[5];
    expect(postCall[0]).toContain("/ledger/postings");
    const body = JSON.parse(postCall[1].body);
    expect(body.type).toBe("student_invoice");
    expect(body.idempotencyKey).toBe("edu-invoice-inv-1");
    expect(body.lines).toEqual([
      { accountId: "acc-receivable", direction: "DEBIT", amountMinor: 500000, currency: "NGN" },
      { accountId: "acc-revenue", direction: "CREDIT", amountMinor: 500000, currency: "NGN" },
    ]);
  });

  it("syncs a payment as a debit to Cash and a credit to Fees Receivable", async () => {
    mockFreshChartAndLogin();
    mockPaymentFindUnique.mockResolvedValue({
      id: "pay-1",
      amount: 200000,
      method: "CASH",
      paidAt: new Date("2026-08-24T00:00:00.000Z"),
    });

    await syncPayment("t1", "pay-1");

    const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[5];
    const body = JSON.parse(postCall[1].body);
    expect(body.type).toBe("student_payment");
    expect(body.idempotencyKey).toBe("edu-payment-pay-1");
    expect(body.lines).toEqual([
      { accountId: "acc-cash", direction: "DEBIT", amountMinor: 200000, currency: "NGN" },
      { accountId: "acc-receivable", direction: "CREDIT", amountMinor: 200000, currency: "NGN" },
    ]);
  });

  it("provisions the chart once and reuses it across a second sync, same tenant", async () => {
    mockFreshChartAndLogin();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse({ id: "tx-2" })); // 2nd posting only

    mockInvoiceFindUnique.mockResolvedValue({ id: "inv-1", amount: 100000, createdAt: new Date() });
    mockPaymentFindUnique.mockResolvedValue({ id: "pay-1", amount: 100000, method: "CASH", paidAt: new Date() });

    await syncInvoice("t1", "inv-1");
    await syncPayment("t1", "pay-1");

    // login(1) + list(1) + create x3 + posting(1) + posting(1) = 7, not 12.
    expect(global.fetch).toHaveBeenCalledTimes(7);
  });

  it("never throws when Core is unreachable", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ECONNREFUSED"));
    mockInvoiceFindUnique.mockResolvedValue({ id: "inv-1", amount: 100000, createdAt: new Date() });
    await expect(syncInvoice("t1", "inv-1")).resolves.toBeUndefined();
  });

  it("never posts a zero-amount invoice", async () => {
    // prepare() (login + chart provisioning, 5 calls) runs before the
    // amount check, so it still needs a full successful mock — only the
    // 6th call (the actual posting) must never happen.
    mockFreshChartAndLogin();
    mockInvoiceFindUnique.mockResolvedValue({ id: "inv-1", amount: 0, createdAt: new Date() });

    await syncInvoice("t1", "inv-1");

    expect(global.fetch).toHaveBeenCalledTimes(5);
    const postingCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter((c) =>
      String(c[0]).includes("/ledger/postings")
    );
    expect(postingCalls).toHaveLength(0);
  });

  it("a delivered credential alone does not enable ledger sync — the explicit allowlist is preserved", async () => {
    // The 2026-08-26 decision: unlike HR/notifications sync, a school that
    // only holds an auto-delivered credential is still NOT enrolled in
    // fee-posting. This map exists precisely so royal-executive's real
    // fee data can't be enrolled implicitly.
    await deliverStoredCredential("stored-password");

    mockTenantFindUnique.mockResolvedValue({ slug: "store-only-school" });
    mockInvoiceFindUnique.mockResolvedValue({ id: "inv-1", amount: 5000, createdAt: new Date() });

    await syncInvoice("t9", "inv-1");

    expect(global.fetch).not.toHaveBeenCalled();
    delete process.env.CORE_SYNC_CREDENTIAL_KEY;
  });

  it("an allowlisted school prefers a delivered credential over its map entry", async () => {
    await deliverStoredCredential("stored-password-wins");

    mockInvoiceFindUnique.mockResolvedValue({ id: "inv-1", amount: 5000, createdAt: new Date() });

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockImplementation(async (url) => {
        if (String(url).endsWith("/auth/login")) {
          return jsonResponse({ accessToken: signAccessToken(900), refreshToken: "r1" });
        }
        if (String(url).endsWith("/ledger/accounts")) {
          return jsonResponse({ accounts: [] });
        }
        return jsonResponse({ id: "tx-1" });
      });

    await syncInvoice("t1", "inv-1");

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const loginCall = calls.find(([url]) => String(url).endsWith("/auth/login"));
    expect(JSON.parse((loginCall as unknown as [string, { body: string }])[1].body).password).toBe(
      "stored-password-wins"
    );

    delete process.env.CORE_SYNC_CREDENTIAL_KEY;
  });
});
