import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

/**
 * Feeds the "who used this, how long" half of the backoffice Activity page
 * (see modules/monitor/activity.service.ts) — upserts today's (actor, day)
 * row in activity_daily_usage on every request that ends up authenticated.
 *
 * Mounted globally, before any router (see app.ts) — that's safe even
 * though req.auth/req.platformAuth are only set by each router's own
 * `authenticate`/`platformAuthenticate` middleware further down the chain,
 * because this reads them from a `res.on("finish")` callback, which only
 * fires after the whole chain (including that downstream auth middleware)
 * has already run. Same pattern as middleware/audit.ts.
 */
export function trackActivityUsage(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 400) return;

    const actor = req.platformAuth
      ? { type: "admin" as const, id: req.platformAuth.platformAdminId }
      : req.auth
        ? { type: req.auth.impersonatedBy ? "admin" as const : "user" as const, id: req.auth.impersonatedBy ?? req.auth.userId }
        : null;
    if (!actor) return;

    touch(actor.type, actor.id).catch((err) => console.error("[activityUsage] touch failed:", err));
  });

  next();
}

async function touch(actorType: "admin" | "user", actorId: string): Promise<void> {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);

  const update: Prisma.ActivityDailyUsageUpdateInput = { lastSeenAt: now, requestCount: { increment: 1 } };

  await prisma.activityDailyUsage.upsert({
    where: { actorType_actorId_day: { actorType, actorId, day } },
    create: { actorType, actorId, day, firstSeenAt: now, lastSeenAt: now, requestCount: 1 },
    update,
  });
}
