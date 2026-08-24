import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const mockEnv: {
  dafsoltCoreHrSyncTenants: Record<string, { email: string; password: string }>;
} = {
  dafsoltCoreHrSyncTenants: {
    "pilot-tenant": { email: "sync-pilot@example.internal", password: "sync-password-pilot" },
  },
};

const mockTenantFindUnique = vi.fn();

vi.mock("../../config/env", () => ({ env: mockEnv }));
vi.mock("../../config/prisma", () => ({
  prisma: { tenant: { findUnique: mockTenantFindUnique } },
}));

function signAccessToken(expiresInSeconds: number) {
  return jwt.sign({ sub: "core-user-1" }, "unused-secret-just-for-exp-decode", {
    expiresIn: expiresInSeconds,
  });
}

describe("core-files-sync.service", () => {
  let originalFetch: typeof global.fetch;
  let getUploadUrl: (typeof import("./core-files-sync.service"))["getUploadUrl"];
  let getDownloadUrl: (typeof import("./core-files-sync.service"))["getDownloadUrl"];
  let CoreFilesUnavailableError: (typeof import("./core-files-sync.service"))["CoreFilesUnavailableError"];

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    mockEnv.dafsoltCoreHrSyncTenants = {
      "pilot-tenant": { email: "sync-pilot@example.internal", password: "sync-password-pilot" },
    };
    mockTenantFindUnique.mockReset();
    mockTenantFindUnique.mockResolvedValue({ slug: "pilot-tenant" });

    // core-files-sync.service.ts caches Core tokens in a module-level Map
    // — reset the module registry and re-import fresh each test so that
    // cache never leaks between test cases.
    vi.resetModules();
    ({ getUploadUrl, getDownloadUrl, CoreFilesUnavailableError } = await import("./core-files-sync.service"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("logs in with the tenant's own credentials, then calls POST /files/upload-url", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uploadUrl: "https://r2.example/put-here", file: { id: "file-1" } }),
      });

    const result = await getUploadUrl("t1", { filename: "cover.jpg", contentType: "image/jpeg", sizeBytes: 1024 });

    expect(result).toEqual({ uploadUrl: "https://r2.example/put-here", fileId: "file-1" });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [loginUrl, loginOpts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(loginUrl).toContain("/auth/login");
    expect(JSON.parse(loginOpts.body)).toEqual({
      email: "sync-pilot@example.internal",
      password: "sync-password-pilot",
    });
    const [uploadUrlCall, uploadOpts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(uploadUrlCall).toContain("/files/upload-url");
    expect(uploadOpts.headers.authorization).toMatch(/^Bearer /);
  });

  it("calls GET /files/:id for a download URL", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r1" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ downloadUrl: "https://r2.example/get-here" }) });

    const result = await getDownloadUrl("t1", "file-1");

    expect(result).toEqual({ downloadUrl: "https://r2.example/get-here" });
    const [downloadUrlCall] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(downloadUrlCall).toContain("/files/file-1");
  });

  it("throws CoreFilesUnavailableError for a tenant not enrolled, rather than silently no-op'ing", async () => {
    mockTenantFindUnique.mockResolvedValue({ slug: "unenrolled-tenant" });

    await expect(getUploadUrl("t2", { filename: "a.jpg", contentType: "image/jpeg", sizeBytes: 10 })).rejects.toThrow(
      CoreFilesUnavailableError
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("throws CoreFilesUnavailableError (not a raw crash) when Core responds with an error", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r1" }),
      })
      .mockResolvedValueOnce({ ok: false, status: 502, text: async () => "upstream R2 error" });

    await expect(getUploadUrl("t1", { filename: "a.jpg", contentType: "image/jpeg", sizeBytes: 10 })).rejects.toThrow(
      CoreFilesUnavailableError
    );
  });

  it("reuses a cached access token across calls for the same tenant instead of logging in again", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: signAccessToken(900), refreshToken: "r1" }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ uploadUrl: "https://r2.example/put", file: { id: "file-x" } }),
      });

    await getUploadUrl("t1", { filename: "a.jpg", contentType: "image/jpeg", sizeBytes: 10 });
    await getUploadUrl("t1", { filename: "b.jpg", contentType: "image/jpeg", sizeBytes: 10 });

    // 1 login + 2 upload-url calls, not 2 logins + 2 calls.
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
