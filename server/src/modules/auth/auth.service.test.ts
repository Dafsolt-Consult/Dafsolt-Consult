import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTenantCreate = vi.fn();
const mockTenantFindUnique = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserFindUniqueOrThrow = vi.fn();
const mockRefreshTokenCreate = vi.fn();
const mockAcademicSessionCreate = vi.fn();
const mockSendTenantWelcome = vi.fn();

vi.mock("../../config/env", () => ({
  env: {
    clientUrl: "https://edu.dafsolt.cloud",
    jwtAccessSecret: "test-access-secret",
    jwtAccessTtl: "15m",
    jwtRefreshSecret: "test-refresh-secret",
    jwtRefreshTtl: "7d",
  },
}));
vi.mock("../../config/prisma", () => ({
  prisma: {
    tenant: { create: mockTenantCreate, findUnique: mockTenantFindUnique },
    user: { findUnique: mockUserFindUnique, findUniqueOrThrow: mockUserFindUniqueOrThrow },
    refreshToken: { create: mockRefreshTokenCreate },
    academicSession: { create: mockAcademicSessionCreate },
  },
}));
vi.mock("../notifications-sync/notifications-sync.service", () => ({
  sendTenantWelcome: mockSendTenantWelcome,
}));

describe("auth.service.onboardSchool — tenant-welcome notification", () => {
  let onboardSchool: (typeof import("./auth.service"))["onboardSchool"];

  beforeEach(async () => {
    ({ onboardSchool } = await import("./auth.service"));

    mockTenantCreate.mockReset();
    mockTenantFindUnique.mockReset().mockResolvedValue(null); // slug is free
    mockUserFindUnique.mockReset().mockResolvedValue(null); // email is free
    mockUserFindUniqueOrThrow.mockReset();
    mockRefreshTokenCreate.mockReset().mockResolvedValue({});
    mockAcademicSessionCreate.mockReset().mockResolvedValue({ id: "session-1" });
    mockSendTenantWelcome.mockReset().mockResolvedValue(undefined);

    mockTenantCreate.mockResolvedValue({
      id: "tenant-1",
      slug: "royal-academy",
      users: [
        {
          id: "user-1",
          email: "admin@royal-academy.test",
          firstName: "Ada",
          lastName: "Owner",
          role: "SCHOOL_ADMIN",
        },
      ],
    });
    mockUserFindUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      email: "admin@royal-academy.test",
      firstName: "Ada",
      lastName: "Owner",
      role: "SCHOOL_ADMIN",
      tenantId: "tenant-1",
      tenant: { id: "tenant-1", name: "Royal Academy", slug: "royal-academy", planTier: "STARTER" },
    });
  });

  it("fires a distinct tenant-welcome notification (not the staff welcome template) after a school onboards", async () => {
    await onboardSchool({
      schoolName: "Royal Academy",
      state: "Lagos",
      country: "Nigeria",
      currency: "NGN",
      adminFirstName: "Ada",
      adminLastName: "Owner",
      adminEmail: "admin@royal-academy.test",
      adminPhone: "08012345678",
      adminPassword: "supersecret1",
    } as never);

    expect(mockSendTenantWelcome).toHaveBeenCalledWith("tenant-1", {
      email: "admin@royal-academy.test",
      recipientName: "Ada Owner",
      loginUrl: "https://edu.dafsolt.cloud/login",
    });
  });
});

describe("auth.service.onboardSchool — default academic session", () => {
  let onboardSchool: (typeof import("./auth.service"))["onboardSchool"];

  const onboardInput = {
    schoolName: "Royal Academy",
    state: "Lagos",
    country: "Nigeria",
    currency: "NGN",
    adminFirstName: "Ada",
    adminLastName: "Owner",
    adminEmail: "admin@royal-academy.test",
    adminPhone: "08012345678",
    adminPassword: "supersecret1",
  } as never;

  beforeEach(async () => {
    ({ onboardSchool } = await import("./auth.service"));

    mockTenantCreate.mockReset().mockResolvedValue({
      id: "tenant-1",
      slug: "royal-academy",
      users: [{ id: "user-1", email: "admin@royal-academy.test", firstName: "Ada", lastName: "Owner", role: "SCHOOL_ADMIN" }],
    });
    mockTenantFindUnique.mockReset().mockResolvedValue(null);
    mockUserFindUnique.mockReset().mockResolvedValue(null);
    mockUserFindUniqueOrThrow.mockReset().mockResolvedValue({
      id: "user-1",
      email: "admin@royal-academy.test",
      firstName: "Ada",
      lastName: "Owner",
      role: "SCHOOL_ADMIN",
      tenantId: "tenant-1",
      tenant: { id: "tenant-1", name: "Royal Academy", slug: "royal-academy", planTier: "STARTER" },
    });
    mockRefreshTokenCreate.mockReset().mockResolvedValue({});
    mockAcademicSessionCreate.mockReset().mockResolvedValue({ id: "session-1" });
    mockSendTenantWelcome.mockReset().mockResolvedValue(undefined);
  });

  it("creates a default current session with 3 terms (First Term also current)", async () => {
    await onboardSchool(onboardInput);

    expect(mockAcademicSessionCreate).toHaveBeenCalledTimes(1);
    const { data } = mockAcademicSessionCreate.mock.calls[0][0];
    expect(data.tenantId).toBe("tenant-1");
    expect(data.isCurrent).toBe(true);
    expect(data.terms.create).toHaveLength(3);
    expect(data.terms.create.map((t: { name: string }) => t.name)).toEqual(["First Term", "Second Term", "Third Term"]);
    expect(data.terms.create[0].isCurrent).toBe(true);
    expect(data.terms.create[1].isCurrent).toBeFalsy();
    expect(data.terms.create[2].isCurrent).toBeFalsy();
    // Every term also carries tenantId directly — Prisma doesn't infer it
    // through the session nesting since Term has its own scalar FK.
    for (const term of data.terms.create) {
      expect(term.tenantId).toBe("tenant-1");
    }
  });

  it("still completes registration (tenant created, session issued) even if seeding the default session fails", async () => {
    mockAcademicSessionCreate.mockRejectedValue(new Error("DB hiccup"));

    const result = await onboardSchool(onboardInput);

    expect(result.user.id).toBe("user-1");
    expect(mockSendTenantWelcome).toHaveBeenCalled(); // registration continued past the failure
  });
});
