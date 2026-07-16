import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { hashPassword } from "../../utils/password";
import { assertStudentSlotAvailable } from "../../utils/planLimits";
import { CreateStudentInput } from "./students.types";

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
      const guardian = await tx.guardian.create({
        data: {
          tenantId,
          firstName: input.guardian.firstName,
          lastName: input.guardian.lastName,
          phone: input.guardian.phone,
          email: input.guardian.email,
        },
      });
      await tx.studentGuardian.create({
        data: { studentId: student.id, guardianId: guardian.id, relationship: input.guardian.relationship, isPrimary: true },
      });
    }

    return tx.student.findUniqueOrThrow({
      where: { id: student.id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, guardianLinks: { include: { guardian: true } } },
    });
  });
}
