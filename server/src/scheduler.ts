import cron from "node-cron";
import { prisma } from "./config/prisma";
import { reportMonitorStatus } from "./modules/monitor/monitor.service";

/** Registers every recurring background job. Called once from index.ts on
 * boot. Each job is intentionally a plain `prisma.updateMany`/aggregate —
 * no queue/worker infra exists in this codebase, and none is needed yet at
 * pilot scale. */
export function startScheduler() {
  // Daily at 01:00 server time: mark any invoice past its due date OVERDUE.
  cron.schedule("0 1 * * *", async () => {
    try {
      const result = await prisma.invoice.updateMany({
        where: { status: { in: ["PENDING", "PARTIALLY_PAID"] }, dueDate: { lt: new Date() } },
        data: { status: "OVERDUE" },
      });
      if (result.count) {
        console.log(`[scheduler] marked ${result.count} invoice(s) OVERDUE`);
      }
    } catch (err) {
      console.error("[scheduler] overdue-invoice sweep failed:", err);
    }
  });

  // Cross-product live status push to the dafsolt.cloud backoffice Monitor
  // page — see modules/monitor/monitor.service.ts. No-ops if
  // MONITOR_REPORT_URL/TOKEN aren't set (local/staging).
  cron.schedule("*/5 * * * *", () => {
    reportMonitorStatus().catch((err) => console.error("[scheduler] monitor report failed:", err));
  });

  console.log("[scheduler] background jobs registered");
}
