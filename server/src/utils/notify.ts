import { NotificationChannel, Prisma, PrismaClient } from "@prisma/client";
import { sendEmail } from "./email";
import { sendSms } from "./sms";

type Tx = Prisma.TransactionClient | PrismaClient;

/** Writes a notification for each recipient on every requested channel
 * (default: in-app only, unchanged from before). EMAIL/SMS channels attempt
 * real delivery via sendEmail/sendSms — see those files for what happens
 * when no provider is configured (a FAILED log with a clear reason, never a
 * thrown error, so the in-app copy still lands). */
export async function notifyUsers(
  tx: Tx,
  tenantId: string,
  userIds: string[],
  input: { subject?: string; message: string },
  channels: NotificationChannel[] = ["IN_APP"]
) {
  const uniqueIds = [...new Set(userIds)];
  if (!uniqueIds.length) return;

  if (channels.includes("IN_APP")) {
    await tx.notificationLog.createMany({
      data: uniqueIds.map((userId) => ({
        tenantId,
        userId,
        channel: "IN_APP" as const,
        subject: input.subject,
        message: input.message,
        status: "SENT" as const,
        sentAt: new Date(),
      })),
    });
  }

  const externalChannels = channels.filter((channel) => channel === "EMAIL" || channel === "SMS");
  if (!externalChannels.length) return;

  const recipients = await tx.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, email: true, phone: true },
  });

  await Promise.all(
    recipients.flatMap((recipient) =>
      externalChannels.map(async (channel) => {
        const result =
          channel === "EMAIL"
            ? await sendEmail(recipient.email, input.subject ?? "Dafsolt BOS notification", input.message)
            : recipient.phone
              ? await sendSms(recipient.phone, input.message)
              : { ok: false as const, reason: "No phone number on file" };

        await tx.notificationLog.create({
          data: {
            tenantId,
            userId: recipient.id,
            channel,
            subject: input.subject,
            message: input.message,
            status: result.ok ? "SENT" : "FAILED",
            sentAt: result.ok ? new Date() : undefined,
            failureReason: result.ok ? undefined : result.reason,
          },
        });
      })
    )
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
