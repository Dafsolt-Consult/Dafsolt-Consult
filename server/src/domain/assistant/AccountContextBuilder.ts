import { UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AuthContext } from "../../middleware/auth";

const RECENT_LIMIT = 5;

export interface AssistantAction {
  name: string;
  route: string; // client-side path, e.g. "/attendance"
  idType: string | null;
  label: string;
}

export interface AssistantContext {
  summary: Record<string, unknown>;
  knownIds: Record<string, string[]>;
  actions: AssistantAction[];
}

/**
 * Builds the ONLY data the in-app assistant is ever allowed to see or act
 * on for a given user: a small, whitelisted summary of their own recent
 * activity, plus the fixed catalog of existing app actions their role may
 * be pointed at. Mirrors App\Domain\Assistant\AccountContextBuilder on
 * finance.dafsolt.cloud.
 *
 * Deliberately excludes anything not already visible on the user's own
 * screens. Every query below is scoped to this user's own tenant AND (for
 * teacher/parent/student) their own records specifically — never a
 * tenant-wide query run under a non-admin's identity.
 *
 * The 'knownIds' bucket returned alongside the summary is the security
 * boundary for actions: AssistantChatService will only ever turn an ACTION
 * the model suggests into a real link if the id it names appears in this
 * exact set — never by re-querying with a model-supplied id.
 */
export class AccountContextBuilder {
  async build(auth: AuthContext): Promise<AssistantContext> {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: auth.userId },
      include: { tenant: true, teacher: true, student: true, guardian: true },
    });

    const base = {
      user: {
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        school: user.tenant?.name ?? null,
      },
    };

    switch (user.role) {
      case UserRole.TEACHER:
        return this.forTeacher(auth.tenantId!, user.teacher!.id, user.id, base);
      case UserRole.SCHOOL_ADMIN:
        return this.forSchoolAdmin(auth.tenantId!, base);
      case UserRole.PARENT:
        return this.forParent(user.guardian?.id ?? null, base);
      case UserRole.STUDENT:
        return this.forStudent(user.student?.id ?? null, base);
      default:
        // Every other role (Librarian, Accountant, Nurse, HR Manager,
        // Transport Officer, Hostel Warden) still gets the knowledge-doc-
        // grounded conversation — just no personal data summary or
        // actions yet, same as finance's `default => []` for uncovered
        // roles.
        return { summary: base, knownIds: {}, actions: [] };
    }
  }

  private async forTeacher(
    tenantId: string,
    teacherId: string,
    teacherUserId: string,
    base: Record<string, unknown>
  ): Promise<AssistantContext> {
    const [lessonPlans, assignments, recentAttendance] = await Promise.all([
      prisma.lessonPlan.findMany({
        where: { tenantId, teacherId },
        orderBy: { date: "desc" },
        take: RECENT_LIMIT,
        include: { subject: true, classArm: true },
      }),
      prisma.assignment.findMany({
        where: { tenantId, teacherId },
        orderBy: { dueDate: "desc" },
        take: RECENT_LIMIT,
        include: { subject: true, classArm: true, submissions: true },
      }),
      prisma.attendance.findMany({
        where: { tenantId, recordedById: teacherUserId },
        orderBy: { date: "desc" },
        take: RECENT_LIMIT,
        include: { classArm: true },
      }),
    ]);

    return {
      summary: {
        ...base,
        recent_lesson_plans: lessonPlans.map((lp) => ({
          id: lp.id,
          topic: lp.topic,
          subject: lp.subject.name,
          class_arm: lp.classArm.name,
          date: lp.date.toISOString().slice(0, 10),
        })),
        recent_assignments: assignments.map((a) => ({
          id: a.id,
          title: a.title,
          subject: a.subject.name,
          class_arm: a.classArm.name,
          due_date: a.dueDate.toISOString().slice(0, 10),
          submissions: a.submissions.length,
        })),
        recently_marked_attendance: recentAttendance.map((att) => ({
          class_arm: att.classArm.name,
          date: att.date.toISOString().slice(0, 10),
          status: att.status,
        })),
      },
      knownIds: {
        lesson_plan: lessonPlans.map((lp) => lp.id),
        assignment: assignments.map((a) => a.id),
      },
      actions: [
        { name: "view_attendance", route: "/attendance", idType: null, label: "Go to Attendance" },
        { name: "view_lesson_plans", route: "/lesson-plans", idType: null, label: "Go to Lesson Plans" },
        { name: "view_assignments", route: "/assignments", idType: null, label: "Go to Assignments" },
      ],
    };
  }

  private async forSchoolAdmin(tenantId: string, base: Record<string, unknown>): Promise<AssistantContext> {
    const [recentStudents, recentPayments] = await Promise.all([
      prisma.student.findMany({
        where: { tenantId },
        orderBy: { admissionDate: "desc" },
        take: RECENT_LIMIT,
        include: { user: true },
      }),
      prisma.payment.findMany({
        where: { tenantId },
        orderBy: { paidAt: "desc" },
        take: RECENT_LIMIT,
        include: { invoice: { include: { student: { include: { user: true } } } } },
      }),
    ]);

    return {
      summary: {
        ...base,
        recently_admitted_students: recentStudents.map((s) => ({
          id: s.id,
          name: `${s.user.firstName} ${s.user.lastName}`,
          admission_number: s.admissionNumber,
          status: s.status,
          admission_date: s.admissionDate.toISOString().slice(0, 10),
        })),
        recent_fee_payments: recentPayments.map((p) => ({
          id: p.id,
          student: `${p.invoice.student.user.firstName} ${p.invoice.student.user.lastName}`,
          amount_kobo: p.amount,
          method: p.method,
          paid_at: p.paidAt.toISOString().slice(0, 10),
        })),
      },
      knownIds: {
        student: recentStudents.map((s) => s.id),
        payment: recentPayments.map((p) => p.id),
      },
      actions: [
        { name: "view_students", route: "/students", idType: null, label: "Go to Students" },
        { name: "view_fees", route: "/fees", idType: null, label: "Go to Fees" },
        { name: "view_teachers", route: "/teachers", idType: null, label: "Go to Teachers" },
      ],
    };
  }

  private async forParent(guardianId: string | null, base: Record<string, unknown>): Promise<AssistantContext> {
    if (!guardianId) {
      return { summary: base, knownIds: {}, actions: [] };
    }

    const links = await prisma.studentGuardian.findMany({
      where: { guardianId },
      include: {
        student: {
          include: {
            user: true,
            resultEntries: { orderBy: { id: "desc" }, take: RECENT_LIMIT, include: { subject: true, term: true } },
          },
        },
      },
    });

    return {
      summary: {
        ...base,
        children: links.map((link) => ({
          id: link.student.id,
          name: `${link.student.user.firstName} ${link.student.user.lastName}`,
          admission_number: link.student.admissionNumber,
          recent_results: link.student.resultEntries.map((r) => ({
            subject: r.subject.name,
            term: r.term.name,
            total_score: r.totalScore,
            grade: r.grade,
          })),
        })),
      },
      knownIds: { student: links.map((l) => l.student.id) },
      actions: [
        { name: "view_results", route: "/results", idType: null, label: "Go to Results" },
        { name: "view_fees", route: "/fees", idType: null, label: "Go to Fees" },
      ],
    };
  }

  private async forStudent(studentId: string | null, base: Record<string, unknown>): Promise<AssistantContext> {
    if (!studentId) {
      return { summary: base, knownIds: {}, actions: [] };
    }

    const [results, submissions] = await Promise.all([
      prisma.resultEntry.findMany({
        where: { studentId },
        orderBy: { id: "desc" },
        take: RECENT_LIMIT,
        include: { subject: true, term: true },
      }),
      prisma.assignmentSubmission.findMany({
        where: { studentId },
        orderBy: { id: "desc" },
        take: RECENT_LIMIT,
        include: { assignment: { include: { subject: true } } },
      }),
    ]);

    return {
      summary: {
        ...base,
        recent_results: results.map((r) => ({
          subject: r.subject.name,
          term: r.term.name,
          total_score: r.totalScore,
          grade: r.grade,
        })),
        recent_assignment_submissions: submissions.map((s) => ({
          id: s.id,
          assignment: s.assignment.title,
          subject: s.assignment.subject.name,
          submitted: s.submittedAt !== null,
          score: s.score,
        })),
      },
      knownIds: { assignment_submission: submissions.map((s) => s.id) },
      actions: [
        { name: "view_results", route: "/results", idType: null, label: "Go to Results" },
        { name: "view_assignments", route: "/assignments", idType: null, label: "Go to Assignments" },
      ],
    };
  }
}
