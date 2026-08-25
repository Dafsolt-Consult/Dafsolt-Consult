import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const mockEnv: {
  dafsoltCoreContactSyncEnabled: boolean;
  dafsoltCoreContactSyncTenants: Record<string, { email: string; password: string }>;
} = {
  dafsoltCoreContactSyncEnabled: true,
  dafsoltCoreContactSyncTenants: {
    blosom: { email: "contact-sync+blosom@example.internal", password: "sync-password-blosom" },
  },
};

const mockTenantFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentUpdate = vi.fn();
const mockGuardianFindUnique = vi.fn();
const mockGuardianUpdate = vi.fn();

vi.mock("../../config/env", () => ({ env: mockEnv }));
vi.mock("../../config/prisma", () => ({
  prisma: {
    tenant: { findUnique: mockTenantFindUnique },
    student: { findUnique: mockStudentFindUnique, update: mockStudentUpdate },
    guardian: { findUnique: mockGuardianFindUnique, update: mockGuardianUpdate },
  },
}));

function signAccessToken(expiresInSeconds: number) {
  return jwt.sign({ sub: "core-user-1" }, "unused-secret-just-for-exp-decode", { expiresIn: expiresInSeconds });
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body, text: async () => JSON.stringify(body) };
}

describe("contact-sync.service", () => {
  let originalFetch: typeof global.fetch;
  let syncStudent: (typeof import("./contact-sync.service"))["syncStudent"];
  let syncGuardian: (typeof import("./contact-sync.service"))["syncGuardian"];

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    mockEnv.dafsoltCoreContactSyncEnabled = true;
    mockEnv.dafsoltCoreContactSyncTenants = {
      blosom: { email: "contact-sync+blosom@example.internal", password: "sync-password-blosom" },
    };
    mockTenantFindUnique.mockReset().mockResolvedValue({ slug: "blosom" });
    mockStudentFindUnique.mockReset();
    mockStudentUpdate.mockReset();
    mockGuardianFindUnique.mockReset();
    mockGuardianUpdate.mockReset();

    // Module-level token cache — reset the module registry and re-import
    // fresh each test, same technique ledger-sync.service.test.ts uses.
    vi.resetModules();
    ({ syncStudent, syncGuardian } = await import("./contact-sync.service"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockLogin() {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ accessToken: signAccessToken(900), refreshToken: "r1" })
    );
  }

  it("is a no-op when the feature flag is disabled", async () => {
    mockEnv.dafsoltCoreContactSyncEnabled = false;
    await syncStudent("t1", "stu-1");
    expect(mockTenantFindUnique).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("is a no-op for a tenant not present in the contact-sync map, even if it's HR-sync enrolled (e.g. royal-executive)", async () => {
    mockTenantFindUnique.mockResolvedValue({ slug: "royal-executive" });
    await syncStudent("t1", "stu-1");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("creates a new Contact (POST) for a student never synced before, tagged student, and stores the returned id", async () => {
    mockLogin();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse({ id: "contact-1" }));
    mockStudentFindUnique.mockResolvedValue({
      id: "stu-1",
      coreContactId: null,
      user: { firstName: "Ada", lastName: "Okoye", email: "ada@example.test", phone: null },
    });

    await syncStudent("t1", "stu-1");

    const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(postCall[0]).toContain("/contacts");
    expect(postCall[1].method).toBe("POST");
    const body = JSON.parse(postCall[1].body);
    expect(body).toEqual({ name: "Ada Okoye", email: "ada@example.test", phone: undefined, tags: ["student"] });

    expect(mockStudentUpdate).toHaveBeenCalledWith({ where: { id: "stu-1" }, data: { coreContactId: "contact-1" } });
  });

  it("patches the existing Contact (no new id stored) when the student already has a coreContactId", async () => {
    mockLogin();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse({}));
    mockStudentFindUnique.mockResolvedValue({
      id: "stu-1",
      coreContactId: "contact-existing",
      user: { firstName: "Ada", lastName: "Okoye", email: "ada@example.test", phone: null },
    });

    await syncStudent("t1", "stu-1");

    const patchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(patchCall[0]).toContain("/contacts/contact-existing");
    expect(patchCall[1].method).toBe("PATCH");
    expect(mockStudentUpdate).not.toHaveBeenCalled();
  });

  it("syncs a guardian tagged guardian, separate Contact row from any linked student", async () => {
    mockLogin();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse({ id: "contact-2" }));
    mockGuardianFindUnique.mockResolvedValue({
      id: "gd-1",
      coreContactId: null,
      firstName: "Chika",
      lastName: "Nwosu",
      phone: "+2348000000000",
      email: null,
    });

    await syncGuardian("t1", "gd-1");

    const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    const body = JSON.parse(postCall[1].body);
    expect(body).toEqual({ name: "Chika Nwosu", email: undefined, phone: "+2348000000000", tags: ["guardian"] });
    expect(mockGuardianUpdate).toHaveBeenCalledWith({ where: { id: "gd-1" }, data: { coreContactId: "contact-2" } });
  });

  it("never throws when Core is unreachable", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ECONNREFUSED"));
    mockStudentFindUnique.mockResolvedValue({
      id: "stu-1",
      coreContactId: null,
      user: { firstName: "Ada", lastName: "Okoye", email: "ada@example.test", phone: null },
    });
    await expect(syncStudent("t1", "stu-1")).resolves.toBeUndefined();
    expect(mockStudentUpdate).not.toHaveBeenCalled();
  });

  it("reuses a cached token across a second sync in the same tenant (only one login call)", async () => {
    mockLogin();
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(jsonResponse({ id: "contact-1" }))
      .mockResolvedValueOnce(jsonResponse({ id: "contact-2" }));

    mockStudentFindUnique.mockResolvedValue({
      id: "stu-1",
      coreContactId: null,
      user: { firstName: "Ada", lastName: "Okoye", email: "ada@example.test", phone: null },
    });
    mockGuardianFindUnique.mockResolvedValue({
      id: "gd-1",
      coreContactId: null,
      firstName: "Chika",
      lastName: "Nwosu",
      phone: "+2348000000000",
      email: null,
    });

    await syncStudent("t1", "stu-1");
    await syncGuardian("t1", "gd-1");

    // login(1) + post(1) + post(1) = 3, not 4.
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
