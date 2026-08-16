/**
 * One-off seed for taking real product screenshots for the marketing site.
 * Builds "Bright Horizons Academy" — a busier, multi-arm school with
 * enough history (3 sessions, 30 days of attendance, invoices in mixed
 * states, graded CBT exams) that every dashboard has real data to show.
 * Not wired into `npm run seed` — run directly with `tsx prisma/seedShowcase.ts`.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { gradeFor } from "../src/utils/grading";

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

const FIRST_NAMES = [
  "Chioma", "Emeka", "Fatima", "Ibrahim", "Ngozi", "Tunde", "Aisha", "Segun", "Amaka", "Kunle",
  "Blessing", "Yusuf", "Grace", "Chidi", "Halima", "Femi", "Adaeze", "Musa", "Precious", "Bayo",
  "Zainab", "Uche", "Kemi", "Danladi", "Ijeoma", "Sadiq", "Omolara", "Chibuzor", "Rahma", "Wale",
];
const LAST_NAMES = [
  "Okafor", "Adeyemi", "Bello", "Eze", "Musa", "Fashola", "Nwosu", "Balogun", "Abiola", "Umar",
  "Chukwu", "Lawal", "Okoro", "Ibrahim", "Adekunle", "Danjuma", "Obi", "Yakubu", "Onyeka", "Sani",
];

function name(i: number) {
  return { first: FIRST_NAMES[i % FIRST_NAMES.length], last: LAST_NAMES[(i * 7) % LAST_NAMES.length] };
}

async function main() {
  console.log("Seeding showcase school (Bright Horizons Academy)...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "bright-horizons" },
    update: {},
    create: {
      name: "Bright Horizons Academy",
      slug: "bright-horizons",
      country: "Nigeria",
      currency: "NGN",
      planTier: "PREMIUM",
      subscriptionStatus: "ACTIVE",
      maxStudents: 1200,
      maxStaff: 120,
    },
  });

  const proprietor = await prisma.user.upsert({
    where: { email: "proprietor@brighthorizons.ng" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "proprietor@brighthorizons.ng",
      passwordHash: await hash("ShowcasePass123!"),
      role: "SCHOOL_ADMIN",
      firstName: "Adaobi",
      lastName: "Nwachukwu",
    },
  });

  // ── Three sessions so the enrollment trend chart has a real slope ────────
  const sessionDefs = [
    { name: "2023/2024", start: "2023-09-01", end: "2024-07-31", current: false },
    { name: "2024/2025", start: "2024-09-01", end: "2025-07-31", current: false },
    { name: "2025/2026", start: "2025-09-01", end: "2026-07-31", current: true },
  ];
  const sessions = [];
  for (const s of sessionDefs) {
    const created = await prisma.academicSession.upsert({
      where: { id: `${tenant.id}-${s.name.replace("/", "-")}` },
      update: {},
      create: {
        id: `${tenant.id}-${s.name.replace("/", "-")}`,
        tenantId: tenant.id,
        name: s.name,
        startDate: new Date(s.start),
        endDate: new Date(s.end),
        isCurrent: s.current,
      },
    });
    sessions.push(created);
  }
  const session = sessions[2];

  const termDefs = [
    { name: "First Term", start: "2025-09-08", end: "2025-12-12", current: false },
    { name: "Second Term", start: "2026-01-12", end: "2026-04-02", current: true },
    { name: "Third Term", start: "2026-04-20", end: "2026-07-24", current: false },
  ];
  const terms = [];
  for (const t of termDefs) {
    const created = await prisma.term.upsert({
      where: { id: `${session.id}-${t.name.replace(/\s/g, "-")}` },
      update: {},
      create: {
        id: `${session.id}-${t.name.replace(/\s/g, "-")}`,
        tenantId: tenant.id,
        sessionId: session.id,
        name: t.name,
        startDate: new Date(t.start),
        endDate: new Date(t.end),
        isCurrent: t.current,
      },
    });
    terms.push(created);
  }
  const term = terms[1]; // Second Term, current

  // ── Class levels + arms ───────────────────────────────────────────────
  const LEVELS = [
    { name: "Primary 5", stage: "PRIMARY" as const, order: 5 },
    { name: "JSS 1", stage: "JUNIOR_SECONDARY" as const, order: 7 },
    { name: "JSS 2", stage: "JUNIOR_SECONDARY" as const, order: 8 },
    { name: "SSS 1", stage: "SENIOR_SECONDARY" as const, order: 10 },
  ];
  const classLevels = [];
  for (const l of LEVELS) {
    const created = await prisma.classLevel.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: l.name } },
      update: {},
      create: { tenantId: tenant.id, ...l },
    });
    classLevels.push(created);
  }

  const armDefs = [
    { level: classLevels[0], names: ["A", "B"] },
    { level: classLevels[1], names: ["A", "B"] },
    { level: classLevels[2], names: ["A"] },
    { level: classLevels[3], names: ["Gold", "Silver"] },
  ];
  const classArms = [];
  for (const group of armDefs) {
    for (const armName of group.names) {
      const created = await prisma.classArm.upsert({
        where: { tenantId_classLevelId_name: { tenantId: tenant.id, classLevelId: group.level.id, name: armName } },
        update: {},
        create: { tenantId: tenant.id, classLevelId: group.level.id, name: armName, capacity: 40 },
      });
      classArms.push({ ...created, level: group.level });
    }
  }

  // ── Subjects ───────────────────────────────────────────────────────────
  const SUBJECTS = [
    { name: "Mathematics", code: "MTH" },
    { name: "English Language", code: "ENG" },
    { name: "Basic Science", code: "BSC" },
    { name: "Social Studies", code: "SOS" },
  ];
  const subjects = [];
  for (const s of SUBJECTS) {
    const created = await prisma.subject.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: s.code } },
      update: {},
      create: { tenantId: tenant.id, ...s, isCore: true, classLevels: { connect: classLevels.map((l) => ({ id: l.id })) } },
    });
    subjects.push(created);
  }
  const [maths, english, science] = subjects;

  // ── Teachers ───────────────────────────────────────────────────────────
  const teacherDefs = [
    { email: "ibrahim.musa@brighthorizons.ng", first: "Ibrahim", last: "Musa", staffId: "T-0001", qualification: "B.Sc Education (Mathematics)" },
    { email: "grace.udo@brighthorizons.ng", first: "Grace", last: "Udo", staffId: "T-0002", qualification: "B.A English & Literary Studies" },
    { email: "femi.ogundipe@brighthorizons.ng", first: "Femi", last: "Ogundipe", staffId: "T-0003", qualification: "B.Sc Biology, PGDE" },
  ];
  const teachers = [];
  for (const t of teacherDefs) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        tenantId: tenant.id,
        email: t.email,
        passwordHash: await hash("ShowcasePass123!"),
        role: "TEACHER",
        firstName: t.first,
        lastName: t.last,
        teacher: { create: { tenantId: tenant.id, staffId: t.staffId, qualification: t.qualification } },
      },
      include: { teacher: true },
    });
    const teacher = user.teacher ?? (await prisma.teacher.findUniqueOrThrow({ where: { userId: user.id } }));
    teachers.push({ user, teacher });
  }
  const [mathsTeacher, englishTeacher] = teachers;

  // Form teacher + subject-teacher assignments on the featured JSS 1 A arm
  const jss1A = classArms.find((a) => a.level.name === "JSS 1" && a.name === "A")!;
  await prisma.classArm.update({ where: { id: jss1A.id }, data: { formTeacherId: mathsTeacher.teacher.id } });

  for (const arm of classArms) {
    for (const [i, subject] of subjects.entries()) {
      const teacher = teachers[i % teachers.length];
      await prisma.classArmSubject.upsert({
        where: { classArmId_subjectId_termId: { classArmId: arm.id, subjectId: subject.id, termId: term.id } },
        update: {},
        create: { tenantId: tenant.id, classArmId: arm.id, subjectId: subject.id, teacherId: teacher.teacher.id, sessionId: session.id, termId: term.id },
      });
    }
  }

  const accountant = await prisma.user.upsert({
    where: { email: "bursar@brighthorizons.ng" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "bursar@brighthorizons.ng",
      passwordHash: await hash("ShowcasePass123!"),
      role: "ACCOUNTANT",
      firstName: "Folasade",
      lastName: "Bakare",
    },
  });

  // ── Fee structure for the current term ────────────────────────────────
  const feeStructures = new Map<string, Awaited<ReturnType<typeof prisma.feeStructure.upsert>>>();
  for (const arm of classArms) {
    const amount = arm.level.stage === "SENIOR_SECONDARY" ? 18500000 : arm.level.stage === "JUNIOR_SECONDARY" ? 15000000 : 12000000; // kobo
    const fs = await prisma.feeStructure.upsert({
      where: { id: `${tenant.id}-fee-${arm.level.id}-${term.id}` },
      update: {},
      create: {
        id: `${tenant.id}-fee-${arm.level.id}-${term.id}`,
        tenantId: tenant.id,
        classLevelId: arm.level.id,
        sessionId: session.id,
        termId: term.id,
        name: `${term.name} School Fees — ${arm.level.name}`,
        amount,
      },
    });
    feeStructures.set(arm.level.id, fs);
  }

  // ── Students, enrollments, attendance, invoices, results ─────────────
  let studentCounter = 0;
  const studentsWithArm: { studentId: string; classArmId: string; user: { id: string } }[] = [];
  let parentGuardian: Awaited<ReturnType<typeof prisma.guardian.upsert>> | null = null;
  let parentUser: Awaited<ReturnType<typeof prisma.user.upsert>> | null = null;

  const REPORT_CARD_COMMENTS = [
    "A focused and dependable student this term — keep up the consistency.",
    "Shows real improvement since last term. Encourage more participation in class discussions.",
    "Bright and attentive, but should pay closer attention to homework deadlines.",
    "A pleasure to teach — strong grasp of core concepts across subjects.",
  ];

  for (const arm of classArms) {
    const rosterSize = arm.name === "A" || arm.name === "Gold" ? 24 : 18;
    const armReportRows: { studentId: string; total: number }[] = [];
    for (let i = 0; i < rosterSize; i++) {
      studentCounter++;
      const { first, last } = name(studentCounter);
      const admissionNumber = `BHA-${String(studentCounter).padStart(4, "0")}`;
      const email = `student${studentCounter}@brighthorizons.ng`;

      const studentUser = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          tenantId: tenant.id,
          email,
          passwordHash: await hash("ShowcasePass123!"),
          role: "STUDENT",
          firstName: first,
          lastName: last,
          student: { create: { tenantId: tenant.id, admissionNumber, gender: studentCounter % 2 === 0 ? "MALE" : "FEMALE" } },
        },
        include: { student: true },
      });
      const student = studentUser.student ?? (await prisma.student.findUniqueOrThrow({ where: { userId: studentUser.id } }));

      await prisma.enrollment.upsert({
        where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } },
        update: {},
        create: { studentId: student.id, classArmId: arm.id, sessionId: session.id },
      });
      // Also enrol in prior sessions for a chunk of the roster so the
      // enrollment-trend chart shows real year-over-year growth.
      if (studentCounter % 2 === 0) {
        await prisma.enrollment.upsert({
          where: { studentId_sessionId: { studentId: student.id, sessionId: sessions[1].id } },
          update: {},
          create: { studentId: student.id, classArmId: arm.id, sessionId: sessions[1].id },
        });
      }
      if (studentCounter % 4 === 0) {
        await prisma.enrollment.upsert({
          where: { studentId_sessionId: { studentId: student.id, sessionId: sessions[0].id } },
          update: {},
          create: { studentId: student.id, classArmId: arm.id, sessionId: sessions[0].id },
        });
      }

      studentsWithArm.push({ studentId: student.id, classArmId: arm.id, user: studentUser });

      // Fee invoice, mixed statuses: ~60% paid in full, ~25% partial, ~15% pending
      const fs = feeStructures.get(arm.level.id)!;
      const roll = studentCounter % 20;
      const amountPaid = roll < 12 ? fs.amount : roll < 17 ? Math.round(fs.amount * 0.55) : 0;
      const status = amountPaid === 0 ? "PENDING" : amountPaid >= fs.amount ? "PAID" : "PARTIALLY_PAID";
      const invoice = await prisma.invoice.upsert({
        where: { id: `${tenant.id}-inv-${student.id}-${term.id}` },
        update: {},
        create: {
          id: `${tenant.id}-inv-${student.id}-${term.id}`,
          tenantId: tenant.id,
          studentId: student.id,
          feeStructureId: fs.id,
          sessionId: session.id,
          termId: term.id,
          amount: fs.amount,
          amountPaid,
          status,
          dueDate: new Date("2026-01-31"),
        },
      });
      if (amountPaid > 0) {
        await prisma.payment.upsert({
          where: { id: `${tenant.id}-pay-${student.id}-${term.id}` },
          update: {},
          create: {
            id: `${tenant.id}-pay-${student.id}-${term.id}`,
            tenantId: tenant.id,
            invoiceId: invoice.id,
            amount: amountPaid,
            method: studentCounter % 3 === 0 ? "BANK_TRANSFER" : studentCounter % 3 === 1 ? "PAYSTACK" : "CASH",
            reference: `PSK-${term.id.slice(-4)}-${String(studentCounter).padStart(4, "0")}`,
            paidAt: new Date("2026-01-20"),
            recordedById: accountant.id,
          },
        });
      }

      // Attendance for the last 25 school days (skip weekends), ~93% present
      for (let d = 0; d < 35; d++) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - d);
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        const isPresent = (studentCounter * 31 + d * 17) % 100 < 93;
        await prisma.attendance.upsert({
          where: { studentId_date: { studentId: student.id, date } },
          update: {},
          create: {
            tenantId: tenant.id,
            studentId: student.id,
            classArmId: arm.id,
            date,
            status: isPresent ? "PRESENT" : (studentCounter + d) % 5 === 0 ? "LATE" : "ABSENT",
            recordedById: mathsTeacher.user.id,
          },
        });
      }

      // Results for the three core subjects, current term
      let studentTotal = 0;
      for (const [si, subject] of [maths, english, science].entries()) {
        const base = 45 + ((studentCounter * (7 + si) + si * 13) % 50); // 45-94 spread
        const ca = Math.min(30, Math.round(base * 0.3));
        const exam = Math.min(70, Math.round(base * 0.7));
        const totalScore = ca + exam;
        studentTotal += totalScore;
        const { grade, remark } = gradeFor(totalScore);
        await prisma.resultEntry.upsert({
          where: { id: `${tenant.id}-res-${student.id}-${subject.id}-${term.id}` },
          update: { caScore: ca, examScore: exam, totalScore, grade, remark },
          create: {
            id: `${tenant.id}-res-${student.id}-${subject.id}-${term.id}`,
            tenantId: tenant.id,
            studentId: student.id,
            classArmId: arm.id,
            subjectId: subject.id,
            sessionId: session.id,
            termId: term.id,
            caScore: ca,
            examScore: exam,
            totalScore,
            grade,
            remark,
          },
        });
      }
      armReportRows.push({ studentId: student.id, total: studentTotal });

      // Pick student #3 (JSS 1 A) as the parent's first child, and student
      // #5 further down (a different arm) as the second child — the parent
      // portal screenshot switches between two kids in different classes.
      if (studentCounter === 3 || studentCounter === 28) {
        if (!parentGuardian) {
          parentUser = await prisma.user.upsert({
            where: { email: "parent@brighthorizons.ng" },
            update: {},
            create: {
              tenantId: tenant.id,
              email: "parent@brighthorizons.ng",
              passwordHash: await hash("ShowcasePass123!"),
              role: "PARENT",
              firstName: "Emeka",
              lastName: "Obiora",
            },
          });
          parentGuardian = await prisma.guardian.upsert({
            where: { userId: parentUser.id },
            update: {},
            create: {
              tenantId: tenant.id,
              userId: parentUser.id,
              firstName: "Emeka",
              lastName: "Obiora",
              phone: "+2348031234567",
              email: "parent@brighthorizons.ng",
              occupation: "Civil Engineer",
            },
          });
        }
        await prisma.studentGuardian.upsert({
          where: { studentId_guardianId: { studentId: student.id, guardianId: parentGuardian.id } },
          update: {},
          create: { studentId: student.id, guardianId: parentGuardian.id, relationship: "Father", isPrimary: true },
        });
      }
    }

    // Report cards for the arm, with a real class position ranked by total score
    const ranked = [...armReportRows].sort((a, b) => b.total - a.total);
    for (const [idx, row] of ranked.entries()) {
      await prisma.reportCard.upsert({
        where: { studentId_termId: { studentId: row.studentId, termId: term.id } },
        update: {
          position: idx + 1,
          classTeacherComment: REPORT_CARD_COMMENTS[idx % REPORT_CARD_COMMENTS.length],
          principalComment: idx === 0 ? "An outstanding result this term. Well done." : "Keep up the good work next term.",
        },
        create: {
          tenantId: tenant.id,
          studentId: row.studentId,
          classArmId: arm.id,
          sessionId: session.id,
          termId: term.id,
          daysPresent: 22,
          daysAbsent: 2,
          position: idx + 1,
          classTeacherComment: REPORT_CARD_COMMENTS[idx % REPORT_CARD_COMMENTS.length],
          principalComment: idx === 0 ? "An outstanding result this term. Well done." : "Keep up the good work next term.",
        },
      });
    }
  }

  // ── CBT: a bank of questions + several graded exams (for exam-performance chart) ─
  const questionBank = [];
  for (let i = 0; i < 12; i++) {
    const q = await prisma.question.upsert({
      where: { id: `${tenant.id}-q-${i}` },
      update: {},
      create: {
        id: `${tenant.id}-q-${i}`,
        tenantId: tenant.id,
        subjectId: maths.id,
        classLevelId: jss1A.level.id,
        type: "MULTIPLE_CHOICE",
        text: `Sample Mathematics question #${i + 1}: what is ${(i + 3) * 4} ÷ ${i % 4 || 1}?`,
        points: 2,
        createdById: proprietor.id,
        options: {
          create: [
            { text: "Option A", isCorrect: i % 4 === 0, order: 0 },
            { text: "Option B", isCorrect: i % 4 === 1, order: 1 },
            { text: "Option C", isCorrect: i % 4 === 2, order: 2 },
            { text: "Option D", isCorrect: i % 4 === 3, order: 3 },
          ],
        },
      },
    });
    questionBank.push(q);
  }

  const jss1Students = studentsWithArm.filter((s) => s.classArmId === jss1A.id);
  const examTitles = [
    "First C.A. Test — Mathematics",
    "Mid-Term Mathematics Quiz",
    "Second Term Mathematics CBT",
    "Basic Science Mock Exam",
  ];
  for (const [ei, title] of examTitles.entries()) {
    const exam = await prisma.exam.upsert({
      where: { id: `${tenant.id}-exam-${ei}` },
      update: {},
      create: {
        id: `${tenant.id}-exam-${ei}`,
        tenantId: tenant.id,
        title,
        subjectId: ei === 3 ? science.id : maths.id,
        classLevelId: jss1A.level.id,
        sessionId: session.id,
        termId: term.id,
        durationMinutes: 40,
        passMark: 50,
        status: "COMPLETED",
        createdById: mathsTeacher.user.id,
        examQuestions: { create: questionBank.slice(0, 8).map((q, i) => ({ questionId: q.id, order: i })) },
      },
    });

    for (const s of jss1Students) {
      const score = 35 + ((ei * 17 + Number(s.studentId.slice(-2).replace(/\D/g, "1") || 1) * 3) % 60);
      await prisma.examAttempt.upsert({
        where: { examId_studentId: { examId: exam.id, studentId: s.studentId } },
        update: {},
        create: {
          examId: exam.id,
          studentId: s.studentId,
          startedAt: new Date("2026-01-15T09:00:00Z"),
          submittedAt: new Date("2026-01-15T09:35:00Z"),
          status: "GRADED",
          autoScore: Math.min(16, score),
          manualScore: 0,
          totalScore: Math.min(100, score),
        },
      });
    }
  }

  console.log("Showcase seed complete.\n");
  console.log("Proprietor (SCHOOL_ADMIN): proprietor@brighthorizons.ng / ShowcasePass123!");
  console.log("Bursar (ACCOUNTANT):       bursar@brighthorizons.ng / ShowcasePass123!");
  console.log("Teacher:                   ibrahim.musa@brighthorizons.ng / ShowcasePass123!");
  console.log("Parent:                    parent@brighthorizons.ng / ShowcasePass123!");
  console.log(`Total students seeded: ${studentCounter}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
