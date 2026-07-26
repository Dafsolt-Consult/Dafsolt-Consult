# School Manager

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

**Platform admin**: `SUPER_ADMIN` now lives entirely outside the tenant
app — a separate `PlatformAdmin` table/auth flow (`server/src/modules/platform`)
and its own `/platform/*` route tree on the client, covering tenant
provisioning, plan/status management, admin impersonation, and the Global
Question Library. No `SUPER_ADMIN` role or route exists on the tenant side
anymore.

**Roles**: `SUPER_ADMIN` (platform), `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`,
`PARENT`, `LIBRARIAN`, `ACCOUNTANT`. Every route is gated by role via
`authorize(...)` middleware.

**Subscription plans**: `FREE` / `BASIC` / `PREMIUM`, each with a student and
staff seat cap enforced at creation time — the natural SaaS upsell lever.

**Password reset**: available to every role at `/forgot-password` (single-use,
1-hour-expiry tokens; resetting revokes all of that account's active
sessions). Delivery is log-based until a real email/SMS provider is wired up
— see `DEPLOYMENT.md` § 6.

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
  Separately, a platform-curated **Global Question Library**
  (`GlobalSubject`/`GlobalQuestion`/`GlobalQuestionOption`) lets platform
  admins maintain a shared, cross-tenant bank of WAEC/NECO/UTME-tagged
  practice questions; tenant teachers import from it into their own
  `Question` bank (`cbt/practiceLibrary.controller.ts`) — the exam-taking
  and grading pipeline never reads the global tables directly.
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

### 5. Deploying for a live pilot

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for a step-by-step guide to running
this on a real VPS with Docker Compose and automatic HTTPS (Caddy) — covers
DNS/firewall prerequisites, secrets setup, first boot, onboarding the real
school, updates, and backups.

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
to view a student they aren't linked to. Also verified the password-reset
flow end-to-end: a stranger and a real account both get the identical
generic "if that email exists…" response (no account enumeration), the
reset link only ever appears in server logs (never the API response), an
invalid/reused token is rejected, a valid one successfully changes the
password, the old password immediately stops working, and a session that
was active before the reset gets its refresh token revoked. Both `server`
and `client` build and type-check cleanly (`npm run build` in each).

## Known limitations / roadmap

- Payment gateway (Paystack/Flutterwave) integration is still stubbed (env
  vars wired in `server/.env.example`) — swap in real provider calls when a
  school is ready to go live with billing. SMS (Africa's Talking) is also
  still stubbed; email is not — see below.
- Real email delivery (SMTP) is wired end-to-end; SMS is the one
  `notifyUsers()` call site away once a provider is chosen.
- File uploads (book covers, ebook files, question images, assignment
  attachments) currently expect a hosted URL; wiring up direct upload (e.g.
  to S3-compatible storage) is a follow-up.
- Announcement/notification audience targeting by school stage assumes a
  student has a single current enrollment; mid-term class transfers mid-day
  aren't specially handled (the next enrollment record simply takes over).
- Direct teacher↔parent/student messaging (beyond announcements/notifications),
  newsletters, and emergency broadcast alerts are not built.

## v1.2 module coverage vs. the full ERP spec

v1.0–v1.2 cover Student Information Management, the Parent Portal, the
Teacher Portal, the Administrator Dashboard (including a dedicated Settings
UI and Compliance/Analytics reporting — `server/src/modules/compliance`,
`.../analytics`), Academic Management, Fee & Finance Management,
Announcements, Library Management, Examination & Results (plus the
platform-curated Global Question Library), Security & Access Control
(role-based permissions, JWT auth), and a standalone Platform-Admin app for
tenant provisioning/plan management/impersonation — **and**, contrary to the
v1.1-era plan below, all of the following are now built and live, each with
its own `server/src/modules/*` and `client/src/pages/*` pair:

- Student disciplinary/conduct records (`disciplinary`)
- Teacher lesson planning (`lesson-plans`)
- Timetable / period scheduling (`timetable`)
- Scholarships / fee discounts (`scholarships`)
- Transport Management (`transport`)
- Hostel/Boarding Management (`hostel`)
- Human Resources & Payroll (`hr`)
- Inventory & Asset Management (`inventory`)
- Audit trail of admin/staff actions (`middleware/audit.ts`, applied to
  tenants/platform/inventory/hostel/compliance routes)
- School Groups (`school-groups`): platform-admin-only grouping of multiple
  `Tenant`s under one `SchoolGroup` (e.g. a customer running several
  campuses as separate tenants), with a consolidated cross-campus report
  (current-snapshot enrollment/attendance/fee-collection numbers per campus
  plus combined totals) on each group's detail page in the platform-admin
  app. Purely additive — no changes to tenant-facing auth, roles, or data
  isolation; a tenant belongs to at most one group (nullable `Tenant.groupId`).
  The four per-tenant metric functions backing this were extracted from
  `analytics.controller.ts` into an exported `analytics.service.ts` so both
  the tenant-facing overview and this platform-facing report reuse the same
  logic instead of duplicating it.

**Built but not yet deployed** (committed on this branch, pending the next
`prisma migrate deploy` + container rebuild — see `DEPLOYMENT.md` § updates):

- E-Learning/LMS (`elearning`): teacher-managed course materials and
  scheduled online class sessions per class+subject, with student/parent
  read access and a Join-link flow. `CourseMaterial`/`OnlineClassSession`
  had existed in `schema.prisma` with no migration, controller, route, or
  UI; all four now exist.
- Alumni Management (`alumni`): a graduate directory, either promoted from
  an existing `Student` (pre-fills name/contact from their `User`) or
  entered manually for pre-digitization graduates. `SCHOOL_ADMIN` CRUD,
  `TEACHER` read-only; no student/parent access (staff-facing directory,
  not a personal record).
- The platform-curated Global Question Library (see CBT section above).

- Teacher ↔ subject ↔ class assignment: a "Teacher Assignments" tab on
  Classes & Subjects (pick class + session + term, assign a teacher per
  subject). The backend (`POST /academics/class-subjects`) worked
  correctly but had no UI anywhere; also fixed a real bug found while
  verifying it — `sessionId`/`termId` were validated with zod's `.cuid()`,
  which rejected the demo seed data's deterministic non-cuid ids (the seed
  script uses `${tenantId}-2025-2026`-style ids so re-seeding is
  idempotent). Loosened to `.min(1)`; existence is enforced by the DB
  foreign key either way. The same `.cuid()`-on-session/term pattern was
  also present in seven other schema files (exams, fees, hostel,
  timetable, students, lesson-plans, results) — now loosened to `.min(1)`
  there too, same rationale.
  Assigning a teacher as a class's form/homeroom teacher
  (`ClassArm.formTeacherId`) had the same "backend exists, no way to reach
  it" gap: `createClassArm` accepted it, but there was no update route and
  no UI, so it could only ever be set once, at creation, never changed.
  Added `PATCH /academics/class-arms/:id` (validates the teacher belongs to
  the tenant, same as other mutation endpoints) and a form-teacher picker
  on the Class Arms tab that shows/changes it per arm.
  Also, the per-subject teacher assignment wasn't actually flexible: the
  dropdown's blank option was a silent no-op (`if (!teacherId) return`) and
  `teacherId` was `.cuid().optional()` — accepts a missing field, not an
  explicit `null` — so once a teacher was assigned to a class+subject there
  was no way to ever unassign them, only overwrite with a different real
  teacher. Reassigning to a different class or subject already worked (each
  row upserts independently); removing one didn't. Made `teacherId`
  `.nullable()`, dropped the frontend guard, relabeled the blank option
  "Unassigned", and added a tenant-ownership check on the teacher id while
  in there (`assignClassSubject` accepted any cuid before, cross-tenant or
  not).
- Non-teaching-staff dashboards (`NURSE`, `HR_MANAGER`,
  `TRANSPORT_OFFICER`, `HOSTEL_WARDEN`): `DashboardPage.tsx` only branched
  on `SCHOOL_ADMIN`/`TEACHER`/`STUDENT`/`LIBRARIAN`/`ACCOUNTANT` — the other
  four roles landed on `/` post-login to a bare "Welcome, {name}" header
  with nothing below it, and didn't even get a "Dashboard" link in the
  sidebar to find their way back to it. Added an overview for each (links
  into their module — Health Records, HR & Payroll, Transport, Hostel —
  plus the shared "My HR" self-service page for leave/payslips) and added
  all four roles to the Dashboard nav item. No real users have these roles
  yet on the live tenant, so this hadn't surfaced in practice.
- Disciplinary Records (`/disciplinary-records`): staff log/filter/resolve
  view, a student's own read-only view, and a "Conduct" tab on the parent
  portal. Same backend-only gap E-Learning had before this session.
- Health & Medical Records (`/health-records`): a per-student medical
  profile (blood group, genotype, allergies, chronic conditions,
  medications, emergency contact, physician) plus a clinic-visit incident
  log, mirroring Disciplinary Records' shape (`HealthRecord` is 1:1 per
  student like `Alumnus`; `HealthIncident` is a 1:many log like
  `DisciplinaryRecord`). `SCHOOL_ADMIN`/`NURSE` can create/edit both;
  `TEACHER` gets read access; students see their own via a read-only view
  reused on a "Health" tab in the parent portal. This was the interrupted
  edit found mid-session: `schema.prisma` had the `HealthRecord[]`/
  `HealthIncident[]` relation stubs added to `Tenant`/`User`/`Student` but
  no model bodies, no migration, no controller/routes, and no UI — the
  schema wouldn't even validate. All of that now exists.
- Scholarships turned out to **not** be a gap — it doesn't have its own
  `client/src/pages` directory, but it's fully built as `ScholarshipsSection`
  inside `client/src/pages/fees/FeesPage.tsx` (search-select a student,
  grant a PERCENT/FIXED discount, deactivate/reactivate), rendered for
  `SCHOOL_ADMIN`/`ACCOUNTANT` on the existing `/fees` page. An earlier pass
  of this doc claimed it had no frontend at all — that was wrong.
- Student promotion (`/students/promotions`): deliberately **not** fully
  automatic. It was tempting to auto-promote a student into "the next
  `ClassLevel` by `order`" once their average score clears a threshold, but
  the live tenant's own `class_levels` data made that unsafe to build:
  `order` is supposed to sort Primary 1..6 / JSS 1..3 / SSS 1..3, but in
  practice it's almost all `1` with a couple of stray `2`s and a `100`, and
  `stage` itself is wrong on some rows (e.g. an "SS 2" class tagged
  `PRIMARY`). Auto-promotion would have silently promoted students into the
  wrong class off that data. Instead: a new `Tenant.promotionPassMark`
  (default 40%, editable on Settings) is only ever a *suggestion* —
  `GET /students/promotion-candidates?classArmId=&sessionId=` averages each
  enrolled student's `ResultEntry.totalScore` for that class+session and
  flags whether it clears the mark, and the Promotions page pre-checks
  those students but lets the admin tick/untick anyone. The admin explicitly
  picks *both* the source class+session and the destination class+session
  (no inferred "next" class), then promoting reuses the existing
  `POST /students/:id/enroll` per selected student — no new write endpoint.
  Graduating a final-year class isn't handled here at all; the page points
  admins at the existing Alumni "promote student" action for that instead.
- CBT question-bank validation hardening + bulk authoring: `questions.schema.ts`'s
  "exactly one correct option" rule was only ever enforced as "at least one" —
  a direct API call could mark 2+ options correct on a `MULTIPLE_CHOICE`
  question, and grading (`options.find((o) => o.isCorrect)`) would silently
  count only the first one, marking a student wrong for picking any other
  "correct" option. The shipped UI already prevented this (a radio-button
  group), so it wasn't user-facing, but `updateQuestionSchema` had no shape
  validation on `options` at all — an update could zero out a question's
  correct answer entirely, breaking grading for every future exam using it.
  Both now share one `findQuestionShapeIssue` check (schema-level on create,
  controller-level on update, since `type` isn't part of the update payload).
  Also added `POST /cbt/questions/bulk`: a teacher builds several questions
  for one subject + class level in a single form and commits them together
  (`BulkAddQuestionsModal.tsx`) instead of repeating the single-add modal
  per question. The identical `findQuestionShapeIssue` gap existed in
  `globalQuestions.schema.ts` too — fixed there via the same now-shared
  `utils/questionShape.ts`, plus a matching `POST /platform/global-questions/bulk`
  for platform admins.
- Student-facing CBT practice mode (`GET /cbt/practice/questions`,
  `POST /cbt/practice/check`, `PracticeModePage.tsx`): the platform-curated
  Global Question Library existed but only teachers could reach it (to
  import into their own exams); students had no access at all. Added a
  stateless practice quiz — pick a subject (or "mixed" across all subjects)
  and exam board, get a randomized set (`utils/shuffle.ts`'s existing
  `seededShuffle`, fresh seed per request), answer instant-feedback
  questions with the answer key withheld until submission (same discipline
  as real exam-taking), see per-question results after. Deliberately no new
  DB model — no persisted practice history, since this is meant to be
  low-stakes repeatable practice, not a graded record.
  Also added `GlobalQuestion.year` (nullable) so imported practice content
  can carry its real exam year — original practice content (all of it
  today) leaves it `null` rather than fabricate a sitting it wasn't part
  of; see `seedGlobalQuestions.ts`'s existing disclaimer, now covering two
  more subjects (Government, Literature-in-English) in the same
  original-content style as the other five.

**Still genuinely outstanding:**

- Direct teacher↔parent/student messaging, newsletters, emergency broadcast
  alerts; real SMS delivery; real payment gateway integration
- A self-service group-admin login (so a customer's own head office could
  log into their group's consolidated report directly, instead of a Dafsolt
  platform admin viewing it on their behalf) — School Groups today is
  platform-admin-only by design; see the `school-groups` entry above.
