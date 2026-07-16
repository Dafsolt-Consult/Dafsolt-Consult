import { Request } from "express";
import { prisma } from "../config/prisma";
import { ApiError } from "./ApiError";

/** Lets STUDENT/PARENT-facing routes accept a Student id or "me" and
 * resolves it to a Student id the caller is actually allowed to view:
 *  - STUDENT: only their own record ("me" or their own id).
 *  - PARENT: any child linked to their Guardian profile ("me" picks the
 *    first linked child, for convenience); any other id is verified against
 *    the StudentGuardian join before being allowed through.
 *  - staff roles: passed through unchanged (tenant scoping happens elsewhere).
 */
export async function resolveStudentParam(req: Request, tenantId: string, param: string): Promise<string> {
  if (!req.auth) throw ApiError.unauthorized();

  if (req.auth.role === "STUDENT") {
    const student = await prisma.student.findFirst({ where: { userId: req.auth.userId, tenantId } });
    if (!student) throw ApiError.forbidden("This account is not linked to a student profile");
    if (param !== "me" && param !== student.id) {
      throw ApiError.forbidden("You can only view your own records");
    }
    return student.id;
  }

  if (req.auth.role === "PARENT") {
    const guardian = await prisma.guardian.findFirst({ where: { userId: req.auth.userId, tenantId } });
    if (!guardian) throw ApiError.forbidden("This account is not linked to a guardian profile");

    if (param === "me") {
      const firstLink = await prisma.studentGuardian.findFirst({
        where: { guardianId: guardian.id },
        orderBy: { id: "asc" },
      });
      if (!firstLink) throw ApiError.forbidden("No children are linked to this account yet");
      return firstLink.studentId;
    }

    const link = await prisma.studentGuardian.findFirst({ where: { guardianId: guardian.id, studentId: param } });
    if (!link) throw ApiError.forbidden("You are not linked to this student");
    return param;
  }

  return param;
}
