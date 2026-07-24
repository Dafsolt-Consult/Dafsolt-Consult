import { Prisma, PrismaClient, UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { hashPassword } from "../../utils/password";
import { assertStudentSlotAvailable } from "../../utils/planLimits";
import { AddGuardianInput, CreateStudentInput } from "./students.types";

type Tx = Prisma.TransactionClient | PrismaClient;

/** Creates (or reuses, for a parent with more than one child) a Guardian and
 * links it to the given student. If a password is supplied and the guardian's
 * email isn't already registered, a PARENT-role login is created for them. */
async function upsertGuardianAndLink(tx: Tx, tenantId: string, studentId: string, guardian: AddGuardianInput) {
  let guardianRecord = null as Awaited<ReturnType<typeof tx.guardian.findFirst>> | null;

  if (guardian.email) {
    const existingUser = await tx.user.findUnique({ where: { email: guardian.email }, include: { guardian: true } });
    if (existingUser) {
      if (existingUser.role !== "PARENT" || existingUser.tenantId !== tenantId || !existingUser.guardian) {
        throw ApiError.conflict("An account with this email already exists");
      }
      guardianRecord = existingUser.guardian;
    }
  }

  if (!guardianRecord) {
    let userId: string | undefined;
    if (guardian.email && guardian.password) {
      const passwordHash = await hashPassword(guardian.password);
      const user = await tx.user.create({
        data: {
          tenantId,
          email: guardian.email,
          passwordHash,
          role: UserRole.PARENT,
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          phone: guardian.phone,
        },
      });
      userId = user.id;
    }

    guardianRecord = await tx.guardian.create({
      data: {
        tenantId,
        userId,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        phone: guardian.phone,
        email: guardian.email,
      },
    });
  }

  return tx.studentGuardian.upsert({
    where: { studentId_guardianId: { studentId, guardianId: guardianRecord.id } },
    update: { relationship: guardian.relationship, isPrimary: guardian.isPrimary ?? true },
    create: { studentId, guardianId: guardianRecord.id, relationship: guardian.relationship, isPrimary: guardian.isPrimary ?? true },
    include: { guardian: true },
  });
}

export async function createStudent(tenantId: string, input: CreateStudentInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const dupeAdmission = await prisma.student.findUnique({
    where: { tenantId_admissionNumber: { tenantId, admissionNumber: input.admissionNumber } },
  });
  if (dupeAdmission) throw ApiError.conflict("Admission number already in use");

  await assertStudentSlotAvailable(tenantId);

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        tenantId,
        email: input.email,
        passwordHash,
        role: "STUDENT",
        firstName: input.firstName,
        lastName: input.lastName,
        student: {
          create: {
            tenantId,
            admissionNumber: input.admissionNumber,
            dateOfBirth: input.dateOfBirth,
            gender: input.gender,
          },
        },
      },
      include: { student: true },
    });

    const student = user.student!;

    await tx.enrollment.create({
      data: { studentId: student.id, classArmId: input.classArmId, sessionId: input.sessionId },
    });

    if (input.guardian) {
      await upsertGuardianAndLink(tx, tenantId, student.id, input.guardian);
    }

    return tx.student.findUniqueOrThrow({
      where: { id: student.id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, guardianLinks: { include: { guardian: true } } },
    });
  });
}

export async function addGuardian(tenantId: string, studentId: string, input: AddGuardianInput) {
  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (!student) throw ApiError.notFound("Student not found");

  return prisma.$transaction((tx) => upsertGuardianAndLink(tx, tenantId, studentId, input));
}
