import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const mockEnv: {
  dafsoltCoreHrSyncEnabled: boolean;
  dafsoltCoreHrSyncTenants: Record<string, { email: string; password: string }>;
} = {
  dafsoltCoreHrSyncEnabled: true,
  dafsoltCoreHrSyncTenants: {
    "pilot-tenant": { email: "sync-pilot@example.internal", password: "sync-password-pilot" },
  },
};

const mockTenantFindUnique = vi.fn();

vi.mock("../../config/env", () => ({ env: mockEnv }));
const mockCredentialFindFirst = vi.fn();

vi.mock("../../config/prisma", () => ({
  prisma: {
    tenant: { findUnique: mockTenantFindUnique },
    coreSyncCredential: { findFirst: mockCredentialFindFirst },
  },
}));

// Delivers a stored (auto-provisioned) credential for the current test to
// resolve; returns nothing — call before syncEmployment().
async function deliverStoredCredential(password: string) {
  process.env.CORE_SYNC_CREDENTIAL_KEY = Buffer.alloc(32, 11).toString("base64");
  const { encryptSecret } = await import("../../utils/secret-box");
  mockCredentialFindFirst.mockResolvedValue({
    email: "sync+school_manager@pilot-tenant.dafsolt.internal",
    passwordCiphertext: encryptSecret(password),
  });
}

function signAccessToken(expiresInSeconds: number) {
  return jwt.sign({ sub: "core-user-1" }, "unused-secret-just-for-exp-decode", {
    expiresIn: expiresInSeconds,
  });
}

describe("hr-sync.service", () => {
  let originalFetch: typeof global.fetch;
  let syncEmployment: (typeof import("./hr-sync.service"))["syncEmployment"];

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    mockEnv.dafsoltCoreHrSyncEnabled = true;
    mockEnv.dafsoltCoreHrSyncTenants = {
      "pilot-tenant": { email: "sync-pilot@example.internal", password: "sync-password-pilot" },
    };
    mockTenantFindUnique.mockReset();
    mockTenantFindUnique.mockResolvedValue({ slug: "pilot-tenant" });
    // No delivered credential by default — pre-existing tests exercise the
    // legacy env-map path.
    mockCredentialFindFirst.mockReset().mockResolvedValue(null);

    // hr-sync.service.ts caches Core tokens in a module-level Map — reset
    // the module registry and re-import fresh each test so that cache
    // (and any other module-level state) never leaks between test cases.
    // vi.mock() calls above apply automatically to the fresh import too.
    vi.resetModules();
    ({ syncEmployment } = await import("./hr-sync.service"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("is a no-op when the feature flag is disabled", async () => {
    mockEnv.dafsoltCoreHrSyncEnabled = false;
    await syncEmployment("t1", { email: "a@pilot.test", status: "active" });
    expect(mockTenantFindUnique).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("is a no-op when the tenant no longer exists", async () => {
    mockTenantFindUnique.mockResolvedValue(null);
    await syncEmployment("gone", { email: "a@pilot.test", status: "active" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("is a no-op for a tenant not present in the credentials map", async () => {
    mockTenantFindUnique.mockResolvedValue({ slug: "unenrolled-tenant" });
    await syncEmployment("t2", { email: "a@other.test", status: "active" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("logs in with that tenant's own credentials, then calls POST /hr/employment-sync", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r1" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ synced: true }) });

    await syncEmployment("t1", {
      email: "teacher@pilot-tenant.test",
      status: "active",
      hireDate: "2026-01-15",
      jobTitle: "TEACHER",
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [loginUrl, loginOpts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(loginUrl).toContain("/auth/login");
    expect(JSON.parse(loginOpts.body)).toEqual({
      email: "sync-pilot@example.internal",
      password: "sync-password-pilot",
    });

    const [syncUrl, syncOpts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(syncUrl).toContain("/hr/employment-sync");
    expect(syncOpts.headers.authorization).toMatch(/^Bearer /);
    expect(JSON.parse(syncOpts.body)).toEqual({
      email: "teacher@pilot-tenant.test",
      status: "active",
      hireDate: "2026-01-15",
      jobTitle: "TEACHER",
    });
  });

  it("reuses a cached access token across calls for the same tenant instead of logging in again", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r1" }),
      })
      .mockResolvedValue({ ok: true, json: async () => ({ synced: true }) });

    await syncEmployment("t1", { email: "a@pilot.test", status: "active" });
    await syncEmployment("t1", { email: "a@pilot.test", status: "terminated" });

    // 1 login + 2 sync calls, not 2 logins + 2 calls.
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("logs back in when a cached token has expired", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(-10), refreshToken: "r1" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ synced: true }) })
      .mockResolvedValueOnce({ ok: false, status: 401 }) // refresh attempt fails
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r2" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ synced: true }) });

    await syncEmployment("t1", { email: "a@pilot.test", status: "active" });
    await syncEmployment("t1", { email: "a@pilot.test", status: "terminated" });

    // login + sync, then a failed refresh + fresh login + sync = 5 calls.
    expect(global.fetch).toHaveBeenCalledTimes(5);
  });

  it("never throws when Core is unreachable", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(syncEmployment("t1", { email: "a@pilot.test", status: "active" })).resolves.toBeUndefined();
  });

  it("logs a no-op result without throwing when Core has no matching user yet", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r1" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ synced: false }) });

    await expect(
      syncEmployment("t1", { email: "never-onboarded@pilot.test", status: "active" })
    ).resolves.toBeUndefined();
  });

  it("prefers a delivered sync credential over the legacy env map", async () => {
    await deliverStoredCredential("stored-password-wins");

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r1" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ synced: true }) });

    await syncEmployment("t1", { email: "a@pilot.test", status: "active" });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const loginBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(loginBody.password).toBe("stored-password-wins");

    delete process.env.CORE_SYNC_CREDENTIAL_KEY;
  });
});
