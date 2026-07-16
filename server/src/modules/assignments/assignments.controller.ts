import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { prisma } from "../../config/prisma";
import { resolveTenantId } from "../../middleware/auth";
import { resolveStudentParam } from "../../utils/resolveStudentId";
import { notifyUsers, studentAndGuardianUserIds } from "../../utils/notify";
import { ApiError } from "../../utils/ApiError";
import { createAssignmentSchema, gradeSubmissionSchema, submitAssignmentSchema, updateAssignmentSchema } from "./assignments.schema";

export const listAssignments = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const { classArmId, subjectId } = req.query as Record<string, string | undefined>;

  const assignments = await prisma.assignment.findMany({
    where: { tenantId, classArmId, subjectId },
    include: { subject: true, classArm: { include: { classLevel: true } }, _count: { select: { submissions: true } } },
    orderBy: { dueDate: "desc" },
  });

  res.json(assignments);
});

export const getAssignment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const assignment = await prisma.assignment.findFirst({
    where: { id: req.params.assignmentId, tenantId },
    include: {
      subject: true,
      classArm: { include: { classLevel: true } },
      submissions: { include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } } },
    },
  });
  if (!assignment) throw ApiError.notFound("Assignment not found");
  res.json(assignment);
});

export const createAssignment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const input = createAssignmentSchema.parse(req.body);

  let teacherId = input.teacherId;
  if (req.auth.role === "TEACHER") {
    const teacher = await prisma.teacher.findFirst({ where: { userId: req.auth.userId, tenantId } });
    if (!teacher) throw ApiError.forbidden("This account is not linked to a teacher profile");
    teacherId = teacher.id;
  }
  if (!teacherId) throw ApiError.badRequest("teacherId is required");

  const assignment = await prisma.assignment.create({
    data: { ...input, teacherId, tenantId },
  });

  const enrollments = await prisma.enrollment.findMany({ where: { classArmId: input.classArmId }, select: { studentId: true } });
  const recipientLists = await Promise.all(enrollments.map((e) => studentAndGuardianUserIds(prisma, e.studentId)));
  await notifyUsers(prisma, tenantId, recipientLists.flat(), {
    subject: "New assignment posted",
    message: `${assignment.title} is due ${assignment.dueDate.toDateString()}.`,
  });

  res.status(201).json(assignment);
});

export const updateAssignment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const input = updateAssignmentSchema.parse(req.body);
  const existing = await prisma.assignment.findFirst({ where: { id: req.params.assignmentId, tenantId } });
  if (!existing) throw ApiError.notFound("Assignment not found");

  const assignment = await prisma.assignment.update({ where: { id: existing.id }, data: input });
  res.json(assignment);
});

export const deleteAssignment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const existing = await prisma.assignment.findFirst({ where: { id: req.params.assignmentId, tenantId } });
  if (!existing) throw ApiError.notFound("Assignment not found");

  await prisma.assignment.delete({ where: { id: existing.id } });
  res.status(204).send();
});

/** Assignments for a given student's current class, each annotated with that
 * student's own submission (if any) — used by both the student portal and
 * the parent dashboard (via resolveStudentParam ownership checks). */
export const listAssignmentsForStudent = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  const studentId = await resolveStudentParam(req, tenantId, req.params.studentId);

  const enrollment = await prisma.enrollment.findFirst({ where: { studentId }, orderBy: { enrolledAt: "desc" } });
  if (!enrollment) return res.json([]);

  const assignments = await prisma.assignment.findMany({
    where: { tenantId, classArmId: enrollment.classArmId },
    include: {
      subject: true,
      submissions: { where: { studentId }, take: 1 },
    },
    orderBy: { dueDate: "desc" },
  });

  res.json(
    assignments.map((a) => ({
      ...a,
      submissions: undefined,
      mySubmission: a.submissions[0] ?? null,
    }))
  );
});

export const submitAssignment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const student = await prisma.student.findFirst({ where: { userId: req.auth.userId, tenantId } });
  if (!student) throw ApiError.forbidden("Only students can submit assignments");

  const assignment = await prisma.assignment.findFirst({ where: { id: req.params.assignmentId, tenantId } });
  if (!assignment) throw ApiError.notFound("Assignment not found");

  const existing = await prisma.assignmentSubmission.findUnique({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
  });
  if (existing?.gradedAt) throw ApiError.conflict("This submission has already been graded and can no longer be changed");

  const input = submitAssignmentSchema.parse(req.body);
  const submission = await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
    update: { ...input, submittedAt: new Date() },
    create: { assignmentId: assignment.id, studentId: student.id, ...input, submittedAt: new Date() },
  });

  res.status(201).json(submission);
});

export const gradeSubmission = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!req.auth) throw ApiError.unauthorized();
  const { score, feedback } = gradeSubmissionSchema.parse(req.body);

  const assignment = await prisma.assignment.findFirst({ where: { id: req.params.assignmentId, tenantId } });
  if (!assignment) throw ApiError.notFound("Assignment not found");
  if (score > assignment.totalPoints) {
    throw ApiError.badRequest(`Score cannot exceed the assignment's maximum of ${assignment.totalPoints}`);
  }

  const submission = await prisma.assignmentSubmission.update({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: req.params.studentId } },
    data: { score, feedback, gradedAt: new Date(), gradedById: req.auth.userId },
  });

  const recipients = await studentAndGuardianUserIds(prisma, req.params.studentId);
  await notifyUsers(prisma, tenantId, recipients, {
    subject: "Assignment graded",
    message: `${assignment.title} has been graded: ${score}/${assignment.totalPoints}.`,
  });

  res.json(submission);
});
