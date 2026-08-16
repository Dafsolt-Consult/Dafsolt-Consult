import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PRIMARY_LEVELS = ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"];
const JSS_LEVELS = ["JSS 1", "JSS 2", "JSS 3"];
const SSS_LEVELS = ["SSS 1", "SSS 2", "SSS 3"];

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("Seeding demo school...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-academy" },
    update: {},
    create: {
      name: "Demo Academy",
      slug: "demo-academy",
      country: "Nigeria",
      currency: "NGN",
      planTier: "GROWTH",
      subscriptionStatus: "ACTIVE",
      maxStudents: 500,
      maxStaff: 50,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@demoacademy.ng" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@demoacademy.ng",
      passwordHash: await hash("DemoPass123!"),
      role: "SCHOOL_ADMIN",
      firstName: "Chioma",
      lastName: "Adebayo",
    },
  });

  const session = await prisma.academicSession.upsert({
    where: { id: `${tenant.id}-2025-2026` },
    update: {},
    create: {
      id: `${tenant.id}-2025-2026`,
      tenantId: tenant.id,
      name: "2025/2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-07-31"),
      isCurrent: true,
    },
  });

  const term = await prisma.term.upsert({
    where: { id: `${session.id}-first-term` },
    update: {},
    create: {
      id: `${session.id}-first-term`,
      tenantId: tenant.id,
      sessionId: session.id,
      name: "First Term",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2025-12-15"),
      isCurrent: true,
    },
  });

  const allLevels = [
    ...PRIMARY_LEVELS.map((name, i) => ({ name, stage: "PRIMARY" as const, order: i + 1 })),
    ...JSS_LEVELS.map((name, i) => ({ name, stage: "JUNIOR_SECONDARY" as const, order: PRIMARY_LEVELS.length + i + 1 })),
    ...SSS_LEVELS.map((name, i) => ({
      name,
      stage: "SENIOR_SECONDARY" as const,
      order: PRIMARY_LEVELS.length + JSS_LEVELS.length + i + 1,
    })),
  ];

  const classLevels = [];
  for (const level of allLevels) {
    const created = await prisma.classLevel.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: level.name } },
      update: {},
      create: { tenantId: tenant.id, ...level },
    });
    classLevels.push(created);
  }

  const jss1 = classLevels.find((l) => l.name === "JSS 1")!;
  const jss1A = await prisma.classArm.upsert({
    where: { tenantId_classLevelId_name: { tenantId: tenant.id, classLevelId: jss1.id, name: "A" } },
    update: {},
    create: { tenantId: tenant.id, classLevelId: jss1.id, name: "A", capacity: 40 },
  });

  const subjects = [
    { name: "Mathematics", code: "MTH" },
    { name: "English Language", code: "ENG" },
    { name: "Basic Science", code: "BSC" },
  ];
  const createdSubjects = [];
  for (const subject of subjects) {
    const created = await prisma.subject.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: subject.code } },
      update: {},
      create: { tenantId: tenant.id, ...subject, isCore: true, classLevels: { connect: [{ id: jss1.id }] } },
    });
    createdSubjects.push(created);
  }
  const maths = createdSubjects[0];

  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@demoacademy.ng" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "teacher@demoacademy.ng",
      passwordHash: await hash("DemoPass123!"),
      role: "TEACHER",
      firstName: "Ibrahim",
      lastName: "Musa",
      teacher: { create: { tenantId: tenant.id, staffId: "T-0001", qualification: "B.Sc Education" } },
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: "student@demoacademy.ng" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "student@demoacademy.ng",
      passwordHash: await hash("DemoPass123!"),
      role: "STUDENT",
      firstName: "Ngozi",
      lastName: "Eze",
      student: { create: { tenantId: tenant.id, admissionNumber: "DA-0001" } },
    },
    include: { student: true },
  });

  const student = await prisma.student.findUniqueOrThrow({ where: { userId: studentUser.id } });
  await prisma.enrollment.upsert({
    where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } },
    update: {},
    create: { studentId: student.id, classArmId: jss1A.id, sessionId: session.id },
  });

  const question = await prisma.question.upsert({
    where: { id: `${tenant.id}-demo-question-1` },
    update: {},
    create: {
      id: `${tenant.id}-demo-question-1`,
      tenantId: tenant.id,
      subjectId: maths.id,
      classLevelId: jss1.id,
      type: "MULTIPLE_CHOICE",
      text: "What is 7 x 8?",
      points: 2,
      createdById: admin.id,
      options: {
        create: [
          { text: "54", isCorrect: false, order: 0 },
          { text: "56", isCorrect: true, order: 1 },
          { text: "64", isCorrect: false, order: 2 },
        ],
      },
    },
  });

  await prisma.exam.upsert({
    where: { id: `${tenant.id}-demo-exam-1` },
    update: {},
    create: {
      id: `${tenant.id}-demo-exam-1`,
      tenantId: tenant.id,
      title: "First Term Mathematics CBT",
      subjectId: maths.id,
      classLevelId: jss1.id,
      sessionId: session.id,
      termId: term.id,
      durationMinutes: 30,
      createdById: admin.id,
      examQuestions: { create: [{ questionId: question.id, order: 0 }] },
    },
  });

  const category = await prisma.bookCategory.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Mathematics" } },
    update: {},
    create: { tenantId: tenant.id, name: "Mathematics" },
  });

  await prisma.book.upsert({
    where: { id: `${tenant.id}-demo-book-1` },
    update: {},
    create: {
      id: `${tenant.id}-demo-book-1`,
      tenantId: tenant.id,
      categoryId: category.id,
      title: "New General Mathematics for JSS 1",
      author: "M.F. Macrae",
      format: "BOTH",
      targetAudience: "JUNIOR_SECONDARY",
      totalCopies: 5,
      availableCopies: 5,
      ebookFileUrl: "https://example.com/library/new-general-mathematics-jss1.pdf",
    },
  });

  console.log("Seed complete.");
  console.log("School admin login: admin@demoacademy.ng / DemoPass123!");
  console.log("Teacher login:      teacher@demoacademy.ng / DemoPass123!");
  console.log("Student login:      student@demoacademy.ng / DemoPass123!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
