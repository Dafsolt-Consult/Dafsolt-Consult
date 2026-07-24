import { UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { hashPassword } from "../../utils/password";
import { assertStaffSlotAvailable } from "../../utils/planLimits";

export async function createStaffAccount(
  tenantId: string,
  input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: UserRole;
    staffId?: string;
    qualification?: string;
  }
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  await assertStaffSlotAvailable(tenantId);

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: input.email,
      passwordHash,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      ...(input.role === "TEACHER"
        ? {
            teacher: {
              create: {
                tenantId,
                staffId: input.staffId ?? `T-${Date.now()}`,
                qualification: input.qualification,
              },
            },
          }
        : {}),
    },
    include: { teacher: true },
  });

  return user;
}
