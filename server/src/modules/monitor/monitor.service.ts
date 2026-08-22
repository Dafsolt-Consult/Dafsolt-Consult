import os from "os";
import { execSync } from "child_process";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { readErrorCounter } from "../../utils/errorCounter";

/**
 * Pushes a small status snapshot to the dafsolt.cloud backoffice Monitor
 * page (see that repo's public/api/monitor-report.php) every 5 minutes —
 * registered in src/scheduler.ts. This is the edu/Dafsolt-Consult half of
 * the same mechanism every Dafsolt BOS product runs; keep the payload
 * shape (health/metrics/errors/resources) in sync with the other ports if
 * changed.
 *
 * Resource numbers reflect this container's own view (os.* reads the
 * container's cgroup-limited view under Docker), which is the right thing
 * to alert on — it's this process's own headroom, not the host's.
 */
export async function reportMonitorStatus(): Promise<void> {
  if (!env.monitorReportUrl || !env.monitorReportToken) {
    return; // not configured (local/staging) — silent no-op
  }

  const dbOk = await checkDatabase();

  const payload = {
    health: { status: dbOk ? "ok" : "down", db: dbOk },
    metrics: await collectMetrics(),
    errors: (() => {
      const { count24h, recent } = readErrorCounter();
      return { count_24h: count24h, recent };
    })(),
    resources: collectResources(),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(env.monitorReportUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Monitor-Token": env.monitorReportToken },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    console.error("[monitor] push failed:", err instanceof Error ? err.message : err);
  }
}

async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function collectMetrics(): Promise<Record<string, number>> {
  try {
    const [tenants, users, students, overdueInvoices] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.student.count(),
      prisma.invoice.count({ where: { status: "OVERDUE" } }),
    ]);
    return { tenants_total: tenants, users_total: users, students_total: students, invoices_overdue: overdueInvoices };
  } catch {
    return {};
  }
}

function collectResources(): { cpu_used_pct: number | null; mem_used_pct: number | null; disk_used_pct: number | null } {
  let cpuUsedPct: number | null = null;
  try {
    const [load1] = os.loadavg();
    const cores = os.cpus().length || 1;
    cpuUsedPct = Math.round((load1 / cores) * 1000) / 10;
  } catch {
    cpuUsedPct = null;
  }

  let memUsedPct: number | null = null;
  try {
    const total = os.totalmem();
    const free = os.freemem();
    memUsedPct = total > 0 ? Math.round(((total - free) / total) * 1000) / 10 : null;
  } catch {
    memUsedPct = null;
  }

  let diskUsedPct: number | null = null;
  try {
    // No disk-usage syscall in Node's stdlib; `df` is present in the
    // node:20-alpine image this runs in (coreutils via busybox).
    const out = execSync("df -k / | tail -1", { encoding: "utf8", timeout: 2000 });
    const parts = out.trim().split(/\s+/);
    const usedPct = parts[4]; // e.g. "63%"
    if (usedPct && usedPct.endsWith("%")) {
      diskUsedPct = parseFloat(usedPct.slice(0, -1));
    }
  } catch {
    diskUsedPct = null;
  }

  return { cpu_used_pct: cpuUsedPct, mem_used_pct: memUsedPct, disk_used_pct: diskUsedPct };
}
