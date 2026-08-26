import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const mockEnv: {
  dafsoltCoreNotifyEnabled: boolean;
  dafsoltCoreHrSyncTenants: Record<string, { email: string; password: string }>;
} = {
  dafsoltCoreNotifyEnabled: true,
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

describe("notifications-sync.service", () => {
  let originalFetch: typeof global.fetch;
  let sendWelcome: (typeof import("./notifications-sync.service"))["sendWelcome"];
  let sendTenantWelcome: (typeof import("./notifications-sync.service"))["sendTenantWelcome"];

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    mockEnv.dafsoltCoreNotifyEnabled = true;
    mockEnv.dafsoltCoreHrSyncTenants = {
      "pilot-tenant": { email: "sync-pilot@example.internal", password: "sync-password-pilot" },
    };
    mockTenantFindUnique.mockReset();
    mockTenantFindUnique.mockResolvedValue({ slug: "pilot-tenant" });
    // No delivered credential by default — pre-existing tests exercise the
    // legacy env-map path.
    mockCredentialFindFirst.mockReset().mockResolvedValue(null);

    // notifications-sync.service.ts caches Core tokens in a module-level
    // Map — reset the module registry and re-import fresh each test so
    // that cache never leaks between test cases. vi.mock() calls above
    // apply automatically to the fresh import too.
    vi.resetModules();
    ({ sendWelcome, sendTenantWelcome } = await import("./notifications-sync.service"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("is a no-op when the feature flag is disabled", async () => {
    mockEnv.dafsoltCoreNotifyEnabled = false;
    await sendWelcome("t1", { email: "a@pilot.test", loginUrl: "https://edu.dafsolt.cloud/login" });
    expect(mockTenantFindUnique).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("is a no-op when the tenant no longer exists", async () => {
    mockTenantFindUnique.mockResolvedValue(null);
    await sendWelcome("gone", { email: "a@pilot.test", loginUrl: "https://edu.dafsolt.cloud/login" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("is a no-op for a tenant not present in the credentials map", async () => {
    mockTenantFindUnique.mockResolvedValue({ slug: "unenrolled-tenant" });
    await sendWelcome("t2", { email: "a@other.test", loginUrl: "https://edu.dafsolt.cloud/login" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("logs in with that tenant's own credentials, then calls POST /notifications with the welcome template", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sent: true, provider: "resend", providerId: "msg_1" }),
      });

    await sendWelcome("t1", {
      email: "teacher@pilot-tenant.test",
      recipientName: "Teacher",
      loginUrl: "https://edu.dafsolt.cloud/login",
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [loginUrl, loginOpts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(loginUrl).toContain("/auth/login");
    expect(JSON.parse(loginOpts.body)).toEqual({
      email: "sync-pilot@example.internal",
      password: "sync-password-pilot",
    });

    const [notifyUrl, notifyOpts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(notifyUrl).toContain("/notifications");
    expect(notifyOpts.headers.authorization).toMatch(/^Bearer /);
    expect(JSON.parse(notifyOpts.body)).toEqual({
      email: "teacher@pilot-tenant.test",
      channel: "email",
      template: "welcome",
      data: { recipientName: "Teacher", loginUrl: "https://edu.dafsolt.cloud/login" },
    });
  });

  it("reuses a cached access token across calls for the same tenant instead of logging in again", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r1" }),
      })
      .mockResolvedValue({ ok: true, json: async () => ({ sent: true }) });

    await sendWelcome("t1", { email: "a@pilot.test", loginUrl: "https://edu.dafsolt.cloud/login" });
    await sendWelcome("t1", { email: "b@pilot.test", loginUrl: "https://edu.dafsolt.cloud/login" });

    // 1 login + 2 notification calls, not 2 logins + 2 calls.
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("never throws when Core is unreachable", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(
      sendWelcome("t1", { email: "a@pilot.test", loginUrl: "https://edu.dafsolt.cloud/login" })
    ).resolves.toBeUndefined();
  });

  it("logs a no-op result without throwing when Core has no matching user yet", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sent: false, reason: "no matching Core user in this tenant yet" }),
      });

    await expect(
      sendWelcome("t1", { email: "never-onboarded@pilot.test", loginUrl: "https://edu.dafsolt.cloud/login" })
    ).resolves.toBeUndefined();
  });

  it("sendTenantWelcome uses a distinct template from sendWelcome", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r1" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sent: true }) });

    await sendTenantWelcome("t1", {
      email: "owner@pilot-tenant.test",
      recipientName: "Owner",
      loginUrl: "https://edu.dafsolt.cloud/login",
    });

    const [, notifyOpts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(JSON.parse(notifyOpts.body).template).toBe("tenant-welcome");
  });

  it("prefers a delivered sync credential over the legacy env map", async () => {
    await deliverStoredCredential("stored-password-wins");

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r1" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sent: true }) });

    await sendWelcome("t1", { email: "a@pilot.test", loginUrl: "https://edu.dafsolt.cloud/login" });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const loginBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(loginBody.password).toBe("stored-password-wins");

    delete process.env.CORE_SYNC_CREDENTIAL_KEY;
  });
});
