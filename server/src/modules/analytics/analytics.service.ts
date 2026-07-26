import { prisma } from "../../config/prisma";

/** Enrolled student count per academic session, oldest first — shows
 * whether the school is growing, shrinking or flat year over year. */
export async function enrollmentTrend(tenantId: string) {
  const sessions = await prisma.academicSession.findMany({
    where: { tenantId },
    orderBy: { startDate: "asc" },
    include: { _count: { select: { enrollments: true } } },
  });
  return sessions.map((s) => ({ session: s.name, count: s._count.enrollments }));
}

/** Daily attendance rate across the whole school for the last 30 days. */
export async function attendanceTrend(tenantId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const records = await prisma.attendance.findMany({
    where: { tenantId, date: { gte: since } },
    select: { date: true, status: true },
  });

  const byDate = new Map<string, { total: number; present: number }>();
  for (const r of records) {
    const key = r.date.toISOString().slice(0, 10);
    const entry = byDate.get(key) ?? { total: 0, present: 0 };
    entry.total += 1;
    if (r.status === "PRESENT") entry.present += 1;
    byDate.set(key, entry);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { total, present }]) => ({
      date,
      rate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
    }));
}

/** Billed vs. collected per term of the current (or most recent) session. */
export async function feeCollectionByTerm(tenantId: string) {
  const session =
    (await prisma.academicSession.findFirst({ where: { tenantId, isCurrent: true } })) ??
    (await prisma.academicSession.findFirst({ where: { tenantId }, orderBy: { startDate: "desc" } }));
  if (!session) return [];

  const terms = await prisma.term.findMany({ where: { tenantId, sessionId: session.id }, orderBy: { startDate: "asc" } });

  return Promise.all(
    terms.map(async (term) => {
      const invoices = await prisma.invoice.findMany({ where: { tenantId, termId: term.id }, select: { amount: true, amountPaid: true } });
      const billed = invoices.reduce((sum, i) => sum + i.amount, 0);
      const paid = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
      return { term: term.name, billed, paid, rate: billed > 0 ? Math.round((paid / billed) * 1000) / 10 : 0 };
    })
  );
}

/** Average score and pass rate for the 10 most recently created exams that
 * have at least one submitted attempt. */
export async function examPerformance(tenantId: string) {
  const exams = await prisma.exam.findMany({
    where: { tenantId, attempts: { some: { status: { in: ["SUBMITTED", "GRADED"] } } } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      attempts: { where: { status: { in: ["SUBMITTED", "GRADED"] } }, select: { totalScore: true } },
    },
  });

  return exams.map((exam) => {
    const scores = exam.attempts.map((a) => a.totalScore);
    const average = scores.length ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : 0;
    const passCount = scores.filter((s) => s >= exam.passMark).length;
    return {
      examTitle: exam.title,
      attempts: scores.length,
      averageScore: average,
      passRate: scores.length ? Math.round((passCount / scores.length) * 1000) / 10 : 0,
    };
  });
}
