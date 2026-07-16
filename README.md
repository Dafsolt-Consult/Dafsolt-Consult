# Dafsolt School Suite

A multi-tenant School Management SaaS built for primary and secondary schools
across Africa, with a full built-in Computer-Based Testing (CBT) engine and a
physical + digital school library. Each school that signs up gets its own
isolated workspace (a "tenant") inside one shared platform — the classic SaaS
model, run and billed centrally by Dafsolt Consult.

## Why this shape

- **Africa-first defaults**: Nigerian/West African curriculum structure out
  of the box (Primary 1–6, JSS 1–3, SSS 1–3), WAEC/NECO-style grading
  (A/B/C/D/E/F), Naira as the default currency, `Africa/Lagos` timezone, and
  stubs for local payment rails (Paystack, Flutterwave) and SMS
  (Africa's Talking) so schools with intermittent connectivity and mobile-money
  billing aren't an afterthought.
- **CBT is a first-class module**, not a bolt-on: a reusable question bank
  (multiple choice, true/false, fill-in-the-blank, theory), an exam builder,
  a timed exam-taking flow with per-student shuffling, instant auto-grading
  for objective questions, and manual grading for theory answers.
- **Library serves both physical and digital lending**: a book catalog that
  tracks physical copies (borrow/return, due dates, fines) alongside ebook
  links schools can host themselves, tagged by target audience (primary vs.
  secondary) so the library stays relevant to whoever is browsing it.
- **A real parent portal, not just a role flag**: guardians get their own
  login (created at admission time or added to an existing student later),
  linked to one or more children. The Parent Portal lets them switch between
  children and monitor performance (grades, attendance, teacher/principal
  comments), assignments, CBT exam results, the school calendar, fee
  invoices/payment history, and school announcements — with in-app
  notifications firing automatically when any of that changes.

## Architecture

```
├── server/     Node.js + Express + TypeScript API, PostgreSQL via Prisma
└── client/     React + TypeScript + Vite + Tailwind SPA
```

**Multi-tenancy**: shared database, shared schema. Every tenant-scoped table
carries a `tenantId` column; a middleware (`resolveTenantId`) pins every
request to the caller's own school, except platform `SUPER_ADMIN` accounts,
which pass an explicit `x-tenant-id` header to act on a specific school.

**Roles**: `SUPER_ADMIN` (platform), `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`,
`PARENT`, `LIBRARIAN`, `ACCOUNTANT`. Every route is gated by role via
`authorize(...)` middleware.

**Subscription plans**: `FREE` / `BASIC` / `PREMIUM`, each with a student and
staff seat cap enforced at creation time — the natural SaaS upsell lever.

## Data model highlights (`server/prisma/schema.prisma`)

- **Academic structure**: `AcademicSession` → `Term`, `ClassLevel` → `ClassArm`,
  `Subject`, with a `ClassArmSubject` join assigning a teacher to a subject in
  a specific class for a specific term.
- **People**: `Student` / `Teacher` / `Guardian` all wrap a `User` (auth
  identity + role); `Enrollment` tracks which class a student sits in per
  session, so students can be promoted year over year without losing history.
- **CBT**: `Question` (+ `QuestionOption`) → `Exam` → `ExamQuestion` →
  `ExamAttempt` → `ExamAnswer`. Question order and MCQ option order are
  shuffled per-student using a seeded PRNG (`utils/shuffle.ts`) so the shuffle
  is anti-cheating yet reproducible if the student reloads mid-exam.
- **Library**: `Book` (physical/ebook/both) + `BookCategory` + `BorrowRecord`
  with automatic fine calculation on late return.
- **Fees**: `FeeStructure` → `Invoice` → `Payment`, amounts stored in minor
  currency units (kobo) to avoid floating-point errors.
- **Results**: `ResultEntry` (CA + exam score, auto-graded A–F) rolled up into
  a per-term `ReportCard` with attendance counts and class position.
- **Assignments**: `Assignment` (per class + subject) → `AssignmentSubmission`
  (text/attachment, teacher score + feedback).
- **School calendar & announcements**: `CalendarEvent` (holidays, exams,
  academic dates) and `Announcement`, the latter targeted by audience (`ALL`,
  `STAFF`, `PARENTS`, or a school stage) and resolved per-viewer at read time.
- **Parents**: `Guardian.userId` is an optional 1:1 link to a `User` (role
  `PARENT`); `StudentGuardian` is the many-to-many join a parent's access is
  checked against everywhere a child's records are requested (see
  `resolveStudentParam` in `utils/resolveStudentId.ts`). The same guardian
  can be linked to several children (siblings), and re-using an email at
  admission time links the new child to the existing parent login instead of
  erroring.
- **Notifications**: `NotificationLog` (in-app for now) is written whenever a
  new assignment, fee invoice, report card, or announcement is created — see
  `utils/notify.ts`.

## Getting started

### 1. Database

```bash
docker compose up -d          # starts Postgres 16 on localhost:5432
```

### 2. Backend

```bash
cd server
cp .env.example .env          # adjust secrets as needed
npm install
npx prisma migrate dev        # applies the schema
npm run seed                  # optional: loads a demo school with sample data
npm run dev                   # http://localhost:4000
```

The seed script creates **Demo Academy** with three ready-to-use logins (all
password `DemoPass123!`): `admin@demoacademy.ng` (school admin),
`teacher@demoacademy.ng` (teacher), `student@demoacademy.ng` (student).

### 3. Frontend

```bash
cd client
npm install
npm run dev                   # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000`.

### 4. New school signup

Visit `/onboard` in the client to register a brand-new school (creates the
tenant + its first `SCHOOL_ADMIN` in one step, starting a 30-day free trial),
or sign in directly at `/login` with a seeded account.

## Verified end-to-end

The full stack was exercised directly against a live PostgreSQL instance
(not just type-checked): school onboarding → academic session/class/subject
setup → student admission → question bank → exam creation → student
exam attempt with shuffled questions/options → auto-grading of objective
answers → manual grading of a theory answer → library borrow/return with
fine tracking → result entry with automatic grade computation → adding a
guardian with a parent-portal login → parent login viewing their child's
performance, assignments, CBT exam history, fees, and announcements →
a student submitting an assignment, a teacher grading it, and the parent
seeing the grade — plus confirming a parent is rejected (403) when trying
to view a student they aren't linked to. Both `server` and `client` build
and type-check cleanly (`npm run build` in each).

## Known limitations / roadmap

- Payment gateway and SMS provider integrations are stubbed (env vars are
  wired in `server/.env.example`) — swap in real Paystack/Flutterwave/Africa's
  Talking calls when a school is ready to go live with billing/notifications
  (in-app notifications already work end-to-end; SMS/email are the same
  `notifyUsers()` call site away).
- File uploads (book covers, ebook files, question images, assignment
  attachments) currently expect a hosted URL; wiring up direct upload (e.g.
  to S3-compatible storage) is a follow-up.
- Announcement/notification audience targeting by school stage assumes a
  student has a single current enrollment; mid-term class transfers mid-day
  aren't specially handled (the next enrollment record simply takes over).

## v1.1 module coverage vs. the full ERP spec

v1.0/v1.1 cover Student Information Management, the Parent Portal, most of
the Teacher Portal, most of the Administrator Dashboard, core Academic
Management, core Fee & Finance Management, Announcements, Library
Management, Examination & Results, and Security & Access Control (role-based
permissions, JWT auth) — each with the gaps noted below carried into v1.2.

**Deferred to v1.2:**

- Student disciplinary/conduct records
- Teacher lesson planning; direct teacher↔parent/student messaging (beyond
  announcements/notifications)
- Admin settings UI (school profile is API-only today); compliance reporting
- Timetable / period scheduling (daily class schedule, distinct from CBT exam
  scheduling); richer curriculum/syllabus content beyond subjects & class levels
- Scholarships/fee discounts; financial reporting/summary dashboards (beyond
  raw invoice & payment lists)
- Newsletters, emergency broadcast alerts, direct messaging; real SMS/email
  delivery (provider integration, not just the in-app notification log)
- Custom analytics dashboards, compliance reports, predictive analytics
- Audit trail of admin/staff actions
- **Not started**: Transport Management, Hostel/Boarding Management, Human
  Resources & Payroll, Inventory & Asset Management
- **Advanced modules not started**: E-Learning/LMS (live classes), Alumni
  Management, Health & Medical Records, true Multi-School (school-group)
  management with consolidated cross-campus reporting
