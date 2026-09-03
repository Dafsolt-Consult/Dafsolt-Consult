import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { errorHandler, notFoundHandler } from "../../middleware/errorHandler";

// kioskLogin (kiosk.controller.ts) only needs prisma.tenant.findUnique to
// resolve — mocked to null so every attempt fails fast with the route's
// generic 401 ("Could not verify your details") without touching a real
// database. What we're exercising here is the rate-limit layer in front of
// the controller, not the controller's own auth logic.
vi.mock("../../config/prisma", () => ({
  prisma: {
    tenant: { findUnique: vi.fn().mockResolvedValue(null) },
    student: { findUnique: vi.fn() },
  },
}));

// kiosk.controller.ts's kioskLogin only reaches signKioskAccessToken (which
// needs env.jwtKioskSecret) on a successful match — every attempt here is
// rejected before that point since the mocked tenant lookup above always
// returns null. Still needs a minimal env stub because src/config/env.ts's
// `required()` throws at import time otherwise.
vi.mock("../../config/env", () => ({
  env: { jwtKioskSecret: "test-kiosk-secret", jwtKioskTtl: "4h" },
  isProd: false,
}));

describe("POST /login — coarse ip:tenantSlug rate limiter", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const kioskRoutes = (await import("./kiosk.routes")).default;
    const app = express();
    app.use(express.json());
    app.use("/api/cbt-kiosk", kioskRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(() => {
    server.close();
  });

  it("still trips even when every attempt uses a different admission number, closing the enumeration gap left by the per-admission-number limiter alone", async () => {
    const tenantSlug = "royal-academy";
    const statuses: number[] = [];

    // 51 requests, same IP + tenantSlug, but a distinct admissionNumber
    // every time. The fine-grained limiter (kioskLoginLimiter, limit 10)
    // keys on ip:tenantSlug:admissionNumber, so with a fresh number on
    // every request it never fires — this loop exercises only the coarse
    // ip:tenantSlug limiter (kioskLoginTenantLimiter, limit 50).
    for (let i = 0; i < 51; i++) {
      const res = await fetch(`${baseUrl}/api/cbt-kiosk/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          admissionNumber: `ADM-${i}`,
          fullName: "Test Student",
        }),
      });
      statuses.push(res.status);
    }

    // First 50 attempts each land in a fresh per-admission-number bucket
    // and reach the controller, which fails them with its normal generic
    // 401 (mocked tenant lookup returns null) — never a 429 from the
    // per-number limiter. The 51st crosses the coarse ip:tenantSlug
    // ceiling and must be rejected with 429, even though it's a brand-new
    // admission number the per-number limiter has never seen before.
    expect(statuses.slice(0, 50)).toEqual(Array(50).fill(401));
    expect(statuses[50]).toBe(429);
  });
});
