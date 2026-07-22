import { Prisma, PrismaClient } from "@prisma/client";
import { sendEmail } from "./email";

type Tx = Prisma.TransactionClient | PrismaClient;

/** Writes an in-app notification for each recipient, and best-effort emails
 * them the same message alongside it. The email is a silent no-op per
 * recipient when SMTP isn't configured (see utils/email.ts), so every
 * existing call site (assignments, invoices, report cards, announcements)
 * gets real email delivery for free once SMTP is set up — nothing to
 * change at the call sites themselves. */
export async function notifyUsers(tx: Tx, tenantId: string, userIds: string[], input: { subject?: string; message: string }) {
  const uniqueIds = [...new Set(userIds)];
  if (!uniqueIds.length) return;

  await tx.notificationLog.createMany({
    data: uniqueIds.map((userId) => ({
      tenantId,
      userId,
      channel: "IN_APP",
      subject: input.subject,
      message: input.message,
      status: "SENT",
      sentAt: new Date(),
    })),
  });

  const recipients = await tx.user.findMany({ where: { id: { in: uniqueIds } }, select: { email: true } });
  await Promise.allSettled(
    recipients.map((r) => sendEmail(r.email, input.subject ?? "School Manager notification", input.message))
  );
}

/** Collects the login-capable recipient user ids for a student: the student
 * themselves plus any guardians who have a parent portal login. */
export async function studentAndGuardianUserIds(tx: Tx, studentId: string): Promise<string[]> {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { userId: true, guardianLinks: { select: { guardian: { select: { userId: true } } } } },
  });
  if (!student) return [];

  const guardianUserIds = student.guardianLinks.map((l) => l.guardian.userId).filter((id): id is string => !!id);
  return [student.userId, ...guardianUserIds];
}
