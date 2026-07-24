import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";

export const listMyChildren = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();

  const guardian = await prisma.guardian.findFirst({ where: { userId: req.auth.userId, tenantId } });
  if (!guardian) return res.json([]);

  const links = await prisma.studentGuardian.findMany({
    where: { guardianId: guardian.id },
    include: {
      student: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          enrollments: { include: { classArm: { include: { classLevel: true } } }, orderBy: { enrolledAt: "desc" }, take: 1 },
        },
      },
    },
  });

  res.json(links.map((l) => ({ ...l.student, relationship: l.relationship, isPrimary: l.isPrimary })));
});
