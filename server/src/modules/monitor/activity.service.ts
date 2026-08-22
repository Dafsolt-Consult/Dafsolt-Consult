import { prisma } from "../../config/prisma";
import { env } from "../../config/env";

const CURSOR_KEY = "audit_log_created_at";
const BATCH_SIZE = 150;

/**
 * Pushes the audit trail (AuditLog rows, "what was done") and today's
 * per-actor usage (activity_daily_usage, "who used this, how long") to the
 * dafsolt.cloud backoffice Activity page every 5 minutes — see
 * scheduler.ts. Same MONITOR_REPORT_URL/TOKEN as reportMonitorStatus, just
 * a different endpoint path; no separate secret.
 */
export async function reportActivityStatus(): Promise<void> {
  if (!env.monitorReportUrl || !env.monitorReportToken) {
    return; // not configured (local/staging) — silent no-op
  }

  const [events, nextCursor] = await collectEvents();
  const usage = await collectUsage();

  if (!events.length && !usage.length) {
    return;
  }

  const url = env.monitorReportUrl.replace("monitor-report.php", "activity-report.php");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Monitor-Token": env.monitorReportToken },
      body: JSON.stringify({ events, usage }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    console.error("[activity] push failed:", err instanceof Error ? err.message : err);
    return; // don't advance the cursor if the push may not have landed
  }

  if (nextCursor) {
    await prisma.activityReportCursor.upsert({
      where: { key: CURSOR_KEY },
      create: { key: CURSOR_KEY, value: nextCursor },
      update: { value: nextCursor },
    });
  }
}

/** @returns [events for the wire, the createdAt cursor to advance to — or null if nothing new] */
async function collectEvents(): Promise<[Array<Record<string, unknown>>, string | null]> {
  try {
    const cursorRow = await prisma.activityReportCursor.findUnique({ where: { key: CURSOR_KEY } });
    const since = cursorRow ? new Date(cursorRow.value) : new Date(0);

    const rows = await prisma.auditLog.findMany({
      where: { createdAt: { gt: since } },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
      include: {
        user: { select: { email: true } },
        platformAdmin: { select: { email: true } },
      },
    });

    if (!rows.length) return [[], null];

    const events = rows.map((row) => ({
      actor_type: row.platformAdminId ? "admin" : "user",
      actor_id: row.platformAdminId ?? row.userId,
      actor_label: row.platformAdmin?.email ?? row.user?.email ?? null,
      action: row.action,
      entity_type: row.entityType,
      entity_id: row.entityId,
      meta: row.tenantId ? { tenant_id: row.tenantId } : null,
      occurred_at: row.createdAt.toISOString(),
    }));

    return [events, rows[rows.length - 1].createdAt.toISOString()];
  } catch (err) {
    console.error("[activity] collectEvents failed:", err instanceof Error ? err.message : err);
    return [[], null];
  }
}

async function collectUsage(): Promise<Array<Record<string, unknown>>> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const rows = await prisma.activityDailyUsage.findMany({ where: { day: { in: [today, yesterday] } } });

    // actorLabel is only populated by the landing-page visitor beacon (see
    // public.service.ts) — the authenticated-request middleware
    // (middleware/activityUsage.ts) deliberately skips a per-request email
    // lookup for cost reasons, so resolve labels here instead, once per
    // push, in two bulk queries.
    const adminIds = rows.filter((r) => r.actorType === "admin" && !r.actorLabel).map((r) => r.actorId);
    const userIds = rows.filter((r) => r.actorType === "user" && !r.actorLabel).map((r) => r.actorId);

    const [admins, users] = await Promise.all([
      adminIds.length ? prisma.platformAdmin.findMany({ where: { id: { in: adminIds } }, select: { id: true, email: true } }) : [],
      userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } }) : [],
    ]);
    const adminEmail = new Map(admins.map((a) => [a.id, a.email]));
    const userEmail = new Map(users.map((u) => [u.id, u.email]));

    return rows.map((row) => ({
      actor_type: row.actorType,
      actor_id: row.actorId,
      actor_label: row.actorLabel ?? (row.actorType === "admin" ? adminEmail.get(row.actorId) : userEmail.get(row.actorId)) ?? null,
      day: row.day,
      first_seen_at: row.firstSeenAt.toISOString(),
      last_seen_at: row.lastSeenAt.toISOString(),
      request_count: row.requestCount,
    }));
  } catch (err) {
    console.error("[activity] collectUsage failed:", err instanceof Error ? err.message : err);
    return [];
  }
}
