import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { generateKeyPairSync } from "crypto";

const mockTenantFindUnique = vi.fn();
const mockCredentialFindFirst = vi.fn();
const mockCredentialUpsert = vi.fn();

vi.mock("../../config/prisma", () => ({
  prisma: {
    tenant: { findUnique: mockTenantFindUnique },
    coreSyncCredential: { findFirst: mockCredentialFindFirst, upsert: mockCredentialUpsert },
  },
}));

// The real env module reads process.env at import time; the receiver only
// needs CORE_SYNC_CREDENTIAL_KEY via secret-box (which reads process.env
// directly), so no env mock is required here — set/cleanup process.env.

const KEY = Buffer.alloc(32, 11).toString("base64");

describe("core-sync-credentials.service", () => {
  let originalFetch: typeof global.fetch;
  let originalKey: string | undefined;

  // Fresh RSA keypair per suite; the JWKS fetch is stubbed to return its
  // public half, so every token below is genuinely signature-verified.
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key-1", alg: "RS256", use: "sig" };

  function signToken(claims: Record<string, unknown>, keyid = "test-key-1"): string {
    return jwt.sign({ iss: "dafsolt-core", type: "provisioning", tenantId: "core-t1", ...claims }, privateKey, {
      algorithm: "RS256",
      keyid,
      expiresIn: "5m",
    });
  }

  const VALID_BODY = {
    tenantSlug: "pilot-school",
    module: "SCHOOL_MANAGER",
    email: "sync+school_manager@pilot-school.dafsolt.internal",
    password: "delivered-password-123",
  };

  async function receive(bearer: string | null, body: Partial<typeof VALID_BODY> = {}) {
    vi.resetModules();
    ({ receiveSyncCredential } = await import("./core-sync-credentials.service"));
    return receiveSyncCredential(bearer, { ...VALID_BODY, ...body });
  }

  let receiveSyncCredential: typeof import("./core-sync-credentials.service").receiveSyncCredential;
  let credentialsForTenantSlug: typeof import("./core-sync-credentials.service").credentialsForTenantSlug;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalKey = process.env.CORE_SYNC_CREDENTIAL_KEY;
    process.env.CORE_SYNC_CREDENTIAL_KEY = KEY;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ keys: [jwk] }),
    }) as unknown as typeof global.fetch;

    mockTenantFindUnique.mockReset().mockResolvedValue({ id: "sm-tenant-1", slug: VALID_BODY.tenantSlug });
    mockCredentialFindFirst.mockReset().mockResolvedValue(null);
    mockCredentialUpsert.mockReset().mockImplementation((_args: unknown) => ({
      id: "cred-1",
      tenantId: "sm-tenant-1",
      email: VALID_BODY.email,
      passwordCiphertext: "stored",
    }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.CORE_SYNC_CREDENTIAL_KEY;
    else process.env.CORE_SYNC_CREDENTIAL_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("stores a valid delivery encrypted at rest and never stores plaintext", async () => {
    await receive(signToken({ tenantSlug: VALID_BODY.tenantSlug, module: VALID_BODY.module }));

    expect(mockCredentialUpsert).toHaveBeenCalledTimes(1);
    const args = mockCredentialUpsert.mock.calls[0][0];
    expect(args.where).toEqual({ tenantId: "sm-tenant-1" });
    expect(args.create.email).toBe(VALID_BODY.email);
    expect(args.create.passwordCiphertext).not.toContain(VALID_BODY.password);
    expect(args.update.passwordCiphertext).not.toContain(VALID_BODY.password);
  });

  it("rejects a delivery with no bearer token and touches nothing", async () => {
    await expect(receive(null)).rejects.toMatchObject({ statusCode: 401 });
    expect(mockCredentialUpsert).not.toHaveBeenCalled();
  });

  it("rejects a token signed by a different key", async () => {
    const { privateKey: other } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const forged = jwt.sign(
      { iss: "dafsolt-core", type: "provisioning", tenantSlug: VALID_BODY.tenantSlug, module: VALID_BODY.module },
      other,
      { algorithm: "RS256", keyid: "test-key-1", expiresIn: "5m" }
    );

    await expect(receive(forged)).rejects.toMatchObject({ statusCode: 401 });
    expect(mockCredentialUpsert).not.toHaveBeenCalled();
  });

  it("rejects an access token — only the provisioning type is ever accepted here", async () => {
    const access = signToken({ tenantSlug: VALID_BODY.tenantSlug, module: VALID_BODY.module, type: "access" });

    await expect(receive(access)).rejects.toMatchObject({ statusCode: 401 });
    expect(mockCredentialUpsert).not.toHaveBeenCalled();
  });

  it("rejects when the token slug does not match the body", async () => {
    const mismatched = signToken({ tenantSlug: "another-school", module: VALID_BODY.module });

    await expect(receive(mismatched, {})).rejects.toMatchObject({ statusCode: 401 });
    // Never even resolved the local tenant — the claim check happens first.
    expect(mockTenantFindUnique).not.toHaveBeenCalled();
  });

  it("rejects when the token module does not match the body", async () => {
    const mismatched = signToken({ tenantSlug: VALID_BODY.tenantSlug, module: "PMS" });

    await expect(receive(mismatched, { module: "PMS" })).rejects.toMatchObject({ statusCode: 401 });
    expect(mockCredentialUpsert).not.toHaveBeenCalled();
  });

  it("rejects a module that is not SCHOOL_MANAGER even with consistent claims", async () => {
    const foreign = signToken({ tenantSlug: VALID_BODY.tenantSlug, module: "KITCHEN_ERP" });

    await expect(receive(foreign, { module: "KITCHEN_ERP" })).rejects.toMatchObject({ statusCode: 401 });
    expect(mockCredentialUpsert).not.toHaveBeenCalled();
  });

  it("404s an unknown tenant slug without storing anything", async () => {
    mockTenantFindUnique.mockResolvedValue(null);
    const token = signToken({ tenantSlug: "ghost-school", module: VALID_BODY.module });

    await expect(receive(token, { tenantSlug: "ghost-school" })).rejects.toMatchObject({ statusCode: 404 });
    expect(mockCredentialUpsert).not.toHaveBeenCalled();
  });

  it("updates the existing row in place on a repeat delivery", async () => {
    await receive(signToken({ tenantSlug: VALID_BODY.tenantSlug, module: VALID_BODY.module }));
    await receive(signToken({ tenantSlug: VALID_BODY.tenantSlug, module: VALID_BODY.module }));

    expect(mockCredentialUpsert).toHaveBeenCalledTimes(2);
  });

  it("fails closed when CORE_SYNC_CREDENTIAL_KEY is unset or invalid", async () => {
    delete process.env.CORE_SYNC_CREDENTIAL_KEY;
    await expect(receive(signToken({ tenantSlug: VALID_BODY.tenantSlug, module: VALID_BODY.module }))).rejects.toThrow(
      /32 bytes/
    );
    expect(mockCredentialUpsert).not.toHaveBeenCalled();
  });

  it("resolution returns null for a tenant with no delivered credential", async () => {
    vi.resetModules();
    ({ credentialsForTenantSlug } = await import("./core-sync-credentials.service"));
    mockCredentialFindFirst.mockResolvedValue(null);

    expect(await credentialsForTenantSlug("no-cred-school")).toBeNull();
  });

  it("resolution decrypts a stored credential", async () => {
    const { encryptSecret } = await import("../../utils/secret-box");
    vi.resetModules();
    ({ credentialsForTenantSlug } = await import("./core-sync-credentials.service"));
    mockCredentialFindFirst.mockResolvedValue({
      email: VALID_BODY.email,
      passwordCiphertext: encryptSecret(VALID_BODY.password),
    });

    expect(await credentialsForTenantSlug("pilot-school")).toEqual({
      email: VALID_BODY.email,
      password: VALID_BODY.password,
    });
  });

  it("resolution fails soft to null when decryption fails (e.g. key rotation)", async () => {
    const { encryptSecret } = await import("../../utils/secret-box");
    vi.resetModules();
    ({ credentialsForTenantSlug } = await import("./core-sync-credentials.service"));

    const warnSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCredentialFindFirst.mockResolvedValue({
      email: VALID_BODY.email,
      passwordCiphertext: encryptSecret(VALID_BODY.password),
    });
    process.env.CORE_SYNC_CREDENTIAL_KEY = Buffer.alloc(32, 99).toString("base64"); // different key

    expect(await credentialsForTenantSlug("pilot-school")).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});
