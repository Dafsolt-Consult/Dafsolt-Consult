import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

/** SCHOOL_ADMIN is locked to their own school's audit trail. SUPER_ADMIN can
 * see the platform-wide trail, optionally filtered to one school via
 * ?tenantId=, since a single school's admin view wouldn't make sense for
 * cross-tenant platform actions like subscription changes. */
export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 30), 100);

  const tenantId = req.auth.role === "SUPER_ADMIN" ? (req.query.tenantId as string | undefined) : req.auth.tenantId;
  if (req.auth.role !== "SUPER_ADMIN" && !tenantId) throw ApiError.forbidden("Account is not attached to a school");

  const where = { tenantId };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { firstName: true, lastName: true, role: true } },
        tenant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});
