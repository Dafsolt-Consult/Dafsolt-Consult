# Dafsolt BOS for School — Support Knowledge

Plain-language reference for the support assistant. Covers how the app
works and why it works that way. Do not invent behavior not described here.

## What this is

Dafsolt BOS for School is an operating system for running a school — not a
single app bolted onto a spreadsheet. It runs as one system serving many
separate schools ("tenants"), each fully isolated from the others. Seven
connected pillars: Administration, Academics, Finance, People,
Communication, Operations, and Analytics.

## Getting started

- **Registration**: a school signs up, picks a plan (Starter, Growth,
  Professional, or Enterprise, based on student count), and gets a 30-day
  guided trial — no card required. Enterprise/multi-campus operators use a
  custom "School Group" plan instead.
- **School Groups**: an operator running more than one campus can manage
  every campus's own isolated workspace from a single account.
- **Roles**: Proprietor/School Admin (full control of the school's
  workspace), Bursar/Accountant (fee structures, invoices, payments,
  scholarships), Teacher (attendance, results entry, question banks, exams,
  assignments — for their own assigned classes only), Student (their own
  timed CBT exams, assignments, results, library, calendar), Parent (a
  dedicated portal tracking every one of their children — one login covers
  all of them), HR Manager (staff attendance, leave, payroll, performance
  reviews), plus Librarian, Nurse, Transport Officer, and Hostel Warden for
  their own specific areas.
- Re-using the same guardian email when a new child is admitted
  automatically links that child to the existing parent account instead of
  creating a duplicate login.

## Academics

- Academic sessions and terms structure the school year; class levels and
  arms (e.g. JSS 1 Diamond) sit under them.
- Subjects are assigned to teachers per class arm, per term.
- **CBT (computer-based testing)**: a question bank feeds an exam builder.
  Question order and multiple-choice option order are shuffled per student
  using a seeded generator — unique per student, but reproducible if they
  reload mid-exam, so no lost progress and no easy answer-sharing. Grading
  is instant for objective questions.
- **Results & report cards**: continuous assessment (CA) + exam scores are
  entered per subject/term and auto-totalled and auto-graded the moment a
  teacher saves — no manual averaging. Nigerian/West African curriculum
  structure (Primary 1–6, JSS 1–3, SSS 1–3) and WAEC/NECO-style A–F grading
  are the defaults.
- Library (physical lending + an ebook catalog), e-learning course
  materials and live classes, assignments with submissions and grading, and
  lesson plans are all part of the same connected system.

## Attendance

Attendance is recorded per class arm, per day, by a teacher or admin.
Report cards pull daily-present/absent counts directly from these records —
there's no separate manual entry for a report card's attendance line.

## Finance

- Fee structures are set by class, session, and term.
- Invoices are billed against a student; payments (cash, transfer, card,
  etc.) are recorded against an invoice and immediately update its
  amount-paid and status.
- Scholarships and discounts apply inline on an invoice.
- Payment gateways (Paystack/Flutterwave) are supported for online
  collection at the gateway's own rate — never a hidden markup.

## People (HR)

Staff attendance, leave requests, payroll runs, and performance reviews all
live under HR & Payroll. A staff member's base salary and hire date live on
their own staff record.

## Communication

- The Parent Portal is one login covering every child a guardian has at the
  school.
- Announcements can be targeted by audience; in-app and SMS notifications
  (Africa's Talking-ready) and a shared school calendar round this out.

## Operations

Transport (routes, vehicles, drivers, student assignments), hostel
(rooms, occupancy, boarding fees), inventory & asset maintenance, an
offline exam-kiosk mode for CBT (a supervised, name + admission-number
login used only for exam-hall computers — nothing else is reachable from
it), and compliance reporting.

## Analytics

Enrollment trend across sessions, daily attendance rate, fee collection
(billed vs. paid, by term), exam performance (average score & pass rate),
and a full audit log — available to the School Admin role.

## Multi-school isolation

Every school's data — students, staff, results, fees, everything — is
completely walled off from every other school's. Platform Administrators
(Dafsolt's own team, roles OWNER/SUPPORT/BILLING/CONTENT_MANAGER) exist
solely for cross-school support and billing/plan management — they do not
perform a school's own operational acts like entering a result or marking
attendance.

## What this assistant does NOT do

It only explains how the system works and how to use it. It cannot look up
a specific student's results, a specific fee balance, or any other real
school data — for that, log in and use the app itself, or contact support
directly.
