import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

const REDACTED_KEYS = /password|secret|token/i;

function redact(body: unknown): Prisma.InputJsonValue | undefined {
  if (!body || typeof body !== "object") return undefined;
  const entries = Object.entries(body as Record<string, unknown>);
  if (!entries.length) return undefined;
  return Object.fromEntries(
    entries.map(([key, value]) => [key, REDACTED_KEYS.test(key) ? "[redacted]" : value])
  ) as Prisma.InputJsonValue;
}

/** Writes an AuditLog row after a mutating request succeeds (2xx). Applied
 * per-route to sensitive/administrative actions, not globally — see
 * README "Audit trail" for which routes carry it. Fire-and-forget: never
 * blocks or fails the request it's attached to. */
export function auditLog(action: string, entityType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    let responseBody: unknown;
    res.json = ((body: unknown) => {
      responseBody = body;
      return originalJson(body);
    }) as typeof res.json;

    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      if (!req.auth && !req.platformAuth) return;

      const paramIdKey = Object.keys(req.params).find((key) => key === "id" || key.endsWith("Id"));
      const entityId =
        (responseBody as { id?: string } | undefined)?.id ?? (paramIdKey ? req.params[paramIdKey] : undefined);

      // Two distinct actor shapes share this table: a tenant User (req.auth,
      // possibly itself an impersonation session) and a platform admin
      // acting directly on platform-only routes (req.platformAuth) — e.g.
      // changing a tenant's plan, which has no tenant User attached to it.
      const tenantId = req.auth?.tenantId ?? req.params.tenantId ?? null;
      const userId = req.auth?.userId ?? null;
      const platformAdminId = req.auth?.impersonatedBy ?? req.platformAuth?.platformAdminId ?? null;

      prisma.auditLog
        .create({
          data: {
            tenantId,
            userId,
            platformAdminId,
            action,
            entityType,
            entityId,
            metadata: redact(req.body),
            ipAddress: req.ip,
          },
        })
        .catch((err) => console.error("Failed to write audit log:", err));
    });

    next();
  };
}
