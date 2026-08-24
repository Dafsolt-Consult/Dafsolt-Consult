import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, type KeyObject } from "crypto";
import jwt from "jsonwebtoken";

const mockEnv: { dafsoltCoreSsoEnabled: boolean } = { dafsoltCoreSsoEnabled: true };

const mockUserFindUnique = vi.fn();
const mockTenantFindUnique = vi.fn();
const mockEnrollmentTrend = vi.fn();
const mockAttendanceTrend = vi.fn();
const mockFeeCollectionByTerm = vi.fn();

vi.mock("../../config/env", () => ({ env: mockEnv }));
vi.mock("../../config/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    tenant: { findUnique: mockTenantFindUnique },
  },
}));
vi.mock("../analytics/analytics.service", () => ({
  enrollmentTrend: mockEnrollmentTrend,
  attendanceTrend: mockAttendanceTrend,
  feeCollectionByTerm: mockFeeCollectionByTerm,
}));

describe("dashboard-summary.service", () => {
  let originalFetch: typeof global.fetch;
  let summary: (typeof import("./dashboard-summary.service"))["summary"];

  let privateKeyPem: string;
  let publicJwk: Record<string, unknown>;
  const KID = "test-key-1";

  function signCoreToken(overrides: Record<string, unknown> = {}, opts: jwt.SignOptions = {}) {
    const payload = {
      sub: "core-user-1",
      iss: "dafsolt-core",
      type: "access",
      email: "admin@pilot-school.test",
      ...overrides,
    };
    return jwt.sign(payload, privateKeyPem, {
      algorithm: "RS256",
      keyid: KID,
      expiresIn: "5m",
      ...opts,
    });
  }

  function mockJwksFetchOk() {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [publicJwk] }),
    });
  }

  beforeEach(async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    privateKeyPem = privateKey.export({ type: "pkcs1", format: "pem" }) as string;
    const jwk = (publicKey as KeyObject).export({ format: "jwk" }) as Record<string, unknown>;
    publicJwk = { ...jwk, kid: KID, alg: "RS256", use: "sig" };

    originalFetch = global.fetch;
    global.fetch = vi.fn();
    mockEnv.dafsoltCoreSsoEnabled = true;
    mockUserFindUnique.mockReset();
    mockTenantFindUnique.mockReset();
    mockEnrollmentTrend.mockReset().mockResolvedValue([{ session: "2025/2026", count: 240 }]);
    mockAttendanceTrend.mockReset().mockResolvedValue([{ date: "2026-08-23", rate: 92.5 }]);
    mockFeeCollectionByTerm.mockReset().mockResolvedValue([{ term: "First Term", billed: 1000000, paid: 750000, rate: 75 }]);

    // Same module-level JWKS cache concern as sso.service.ts and the
    // sync services — reset the module registry and re-import fresh each
    // test so the cache never leaks between test cases.
    vi.resetModules();
    ({ summary } = await import("./dashboard-summary.service"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("rejects with a 404-shaped error when the feature flag is disabled", async () => {
    mockEnv.dafsoltCoreSsoEnabled = false;
    await expect(summary(signCoreToken())).rejects.toMatchObject({ statusCode: 404 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects an invalid/expired Core token", async () => {
    mockJwksFetchOk();
    const badToken = signCoreToken({}, { expiresIn: "-1s" });
    await expect(summary(badToken)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects a token with the wrong issuer", async () => {
    mockJwksFetchOk();
    await expect(summary(signCoreToken({ iss: "someone-else" }))).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects when no user matches the email, never touching analytics", async () => {
    mockJwksFetchOk();
    mockUserFindUnique.mockResolvedValue(null);
    await expect(summary(signCoreToken())).rejects.toThrow("No School Manager account found for this email.");
    expect(mockEnrollmentTrend).not.toHaveBeenCalled();
  });

  it("rejects an inactive user", async () => {
    mockJwksFetchOk();
    mockUserFindUnique.mockResolvedValue({ id: "u1", tenantId: "t1", isActive: false });
    await expect(summary(signCoreToken())).rejects.toMatchObject({ statusCode: 401 });
    expect(mockEnrollmentTrend).not.toHaveBeenCalled();
  });

  it("rejects a user with no tenant", async () => {
    mockJwksFetchOk();
    mockUserFindUnique.mockResolvedValue({ id: "u1", tenantId: null, isActive: true });
    await expect(summary(signCoreToken())).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns a fixed-shape summary, scoped to the matched user's own tenant, for a valid token", async () => {
    mockJwksFetchOk();
    mockUserFindUnique.mockResolvedValue({ id: "u1", tenantId: "t1", isActive: true });
    mockTenantFindUnique.mockResolvedValue({ id: "t1", name: "Pilot School" });

    const result = await summary(signCoreToken());

    expect(mockTenantFindUnique).toHaveBeenCalledWith({ where: { id: "t1" } });
    expect(mockEnrollmentTrend).toHaveBeenCalledWith("t1");
    expect(mockAttendanceTrend).toHaveBeenCalledWith("t1");
    expect(mockFeeCollectionByTerm).toHaveBeenCalledWith("t1");

    expect(result).toEqual({
      product: "SCHOOL_MANAGER",
      tenantName: "Pilot School",
      headline: [
        { label: "Enrolled students", value: "240" },
        { label: "Attendance", value: "92.5%" },
        { label: "Fees collected", value: "75%" },
      ],
      lists: [],
    });
  });

  it("degrades to 'No data yet' when a tenant has no attendance or fee history", async () => {
    mockJwksFetchOk();
    mockUserFindUnique.mockResolvedValue({ id: "u1", tenantId: "t1", isActive: true });
    mockTenantFindUnique.mockResolvedValue({ id: "t1", name: "Brand New School" });
    mockEnrollmentTrend.mockResolvedValue([]);
    mockAttendanceTrend.mockResolvedValue([]);
    mockFeeCollectionByTerm.mockResolvedValue([]);

    const result = await summary(signCoreToken());

    expect(result.headline).toEqual([
      { label: "Enrolled students", value: "0" },
      { label: "Attendance", value: "No data yet" },
      { label: "Fees collected", value: "No data yet" },
    ]);
  });
});
