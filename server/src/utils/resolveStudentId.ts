import { Request } from "express";
import { prisma } from "../config/prisma";
import { ApiError } from "./ApiError";

/** Lets STUDENT/PARENT-facing routes accept "me" in place of a Student id,
 * resolving it to the authenticated user's own student record. */
export async function resolveStudentParam(req: Request, tenantId: string, param: string): Promise<string> {
  if (param !== "me") return param;
  if (!req.auth) throw ApiError.unauthorized();

  const student = await prisma.student.findFirst({ where: { userId: req.auth.userId, tenantId } });
  if (!student) throw ApiError.forbidden("This account is not linked to a student profile");
  return student.id;
}
