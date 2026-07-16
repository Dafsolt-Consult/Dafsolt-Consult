import { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/** Writes an in-app notification for each recipient. Delivery is immediate
 * (no external SMS/email provider is wired up yet — see README roadmap), so
 * every entry is created already marked SENT. */
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
