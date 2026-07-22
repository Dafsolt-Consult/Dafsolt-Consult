import { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/** Records an admin/staff action for the audit trail. `tenantId` is
 * nullable so platform-level actions (e.g. a SUPER_ADMIN action with no
 * specific school in view) can still be logged. Never throws — a logging
 * failure should never break the action it's describing. */
export async function logAudit(
  tx: Tx,
  params: {
    tenantId: string | null;
    actorId: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    /** Arbitrary object describing the change (e.g. parsed request input) —
     * round-tripped through JSON so Date objects and the like become
     * JSON-safe without every call site needing to sanitize it itself. */
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata ? (JSON.parse(JSON.stringify(params.metadata)) as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log entry:", err);
  }
}
