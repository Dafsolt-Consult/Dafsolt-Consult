import { Request, Response } from "express";
import { AnnouncementAudience, UserRole } from "@prisma/client";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { notifyUsers, studentAndGuardianUserIds } from "../../utils/notify";
import { createAnnouncementSchema } from "./announcements.schema";

const STAFF_ROLES: UserRole[] = [
  "SCHOOL_ADMIN",
  "TEACHER",
  "LIBRARIAN",
  "ACCOUNTANT",
  "NURSE",
  "HR_MANAGER",
  "TRANSPORT_OFFICER",
  "HOSTEL_WARDEN",
];

/** Announcements are broadcast by audience rather than to specific users, so
 * visibility is computed at read time from the caller's role (and, for
 * students/parents, the school stage(s) of the children involved). */
async function visibleAudiences(req: Request, tenantId: string): Promise<AnnouncementAudience[]> {
  if (!req.auth) throw ApiError.unauthorized();

  if (STAFF_ROLES.includes(req.auth.role)) {
    return ["ALL", "STAFF", "PARENTS", "PRIMARY", "JUNIOR_SECONDARY", "SENIOR_SECONDARY"];
  }

  if (req.auth.role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { userId: req.auth.userId, tenantId },
      include: { enrollments: { include: { classArm: { include: { classLevel: true } } }, orderBy: { enrolledAt: "desc" }, take: 1 } },
    });
    const stage = student?.enrollments[0]?.classArm.classLevel.stage;
    return stage ? ["ALL", stage] : ["ALL"];
  }

  if (req.auth.role === "PARENT") {
    const guardian = await prisma.guardian.findFirst({
      where: { userId: req.auth.userId, tenantId },
      include: {
        studentLinks: {
          include: {
            student: {
              include: { enrollments: { include: { classArm: { include: { classLevel: true } } }, orderBy: { enrolledAt: "desc" }, take: 1 } },
            },
          },
        },
      },
    });
    const stages = guardian?.studentLinks.map((l) => l.student.enrollments[0]?.classArm.classLevel.stage).filter((s): s is NonNullable<typeof s> => !!s) ?? [];
    return ["ALL", "PARENTS", ...new Set(stages)];
  }

  return ["ALL"];
}

export const listAnnouncements = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const audiences = await visibleAudiences(req, tenantId);

  const announcements = await prisma.announcement.findMany({
    where: { tenantId, audience: { in: audiences } },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
    orderBy: { publishedAt: "desc" },
  });

  res.json(announcements);
});

export const createAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createAnnouncementSchema.parse(req.body);

  const announcement = await prisma.announcement.create({ data: { ...input, tenantId, createdById: req.auth.userId } });

  const recipientIds = await recipientsFor(tenantId, input.audience);
  await notifyUsers(prisma, tenantId, recipientIds, { subject: "New school announcement", message: input.title });

  res.status(201).json(announcement);
});

async function recipientsFor(tenantId: string, audience: AnnouncementAudience): Promise<string[]> {
  if (audience === "STAFF") {
    const staff = await prisma.user.findMany({ where: { tenantId, role: { in: STAFF_ROLES } }, select: { id: true } });
    return staff.map((s) => s.id);
  }

  if (audience === "PARENTS") {
    const guardians = await prisma.guardian.findMany({ where: { tenantId, userId: { not: null } }, select: { userId: true } });
    return guardians.map((g) => g.userId).filter((id): id is string => !!id);
  }

  const students = await prisma.student.findMany({
    where:
      audience === "ALL"
        ? { tenantId }
        : { tenantId, enrollments: { some: { classArm: { classLevel: { stage: audience } } } } },
    select: { id: true },
  });
  const recipientLists = await Promise.all(students.map((s) => studentAndGuardianUserIds(prisma, s.id)));
  return recipientLists.flat();
}
