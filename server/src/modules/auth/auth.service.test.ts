import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTenantCreate = vi.fn();
const mockTenantFindUnique = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserFindUniqueOrThrow = vi.fn();
const mockRefreshTokenCreate = vi.fn();
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
