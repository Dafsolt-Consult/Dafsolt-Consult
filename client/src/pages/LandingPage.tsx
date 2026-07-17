import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* ---------- small local icon set (no new dependency) ---------- */

function Icon({ path, className = "h-6 w-6" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}

const icons = {
  academics: "M12 3 1 8l11 5 9-4.09V15h2V8L12 3Zm-7 8.18V16c0 1.1 3.13 3 7 3s7-1.9 7-3v-4.82l-7 3.18-7-3.18Z",
  cbt: "M9 12.75 11.25 15 15 9.75M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9Z",
  library: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z",
  fees: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  parents: "M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11 10v-2a4 4 0 0 0-3-3.87M16 2.13a4 4 0 0 1 0 7.75",
  attendance: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 10 3 3 5-6",
  reports: "M3 3v18h18M8 17V9m5 8V5m5 12v-5",
  chevronDown: "m6 9 6 6 6-6",
  check: "M20 6 9 17l-5-5",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0 0c2.5-2.7 4-6.2 4-10s-1.5-7.3-4-10M12 22c-2.5-2.7-4-6.2-4-10s1.5-7.3 4-10M2.5 9h19M2.5 15h19",
  bolt: "M13 2 3 14h7l-1 8 10-12h-7l1-8Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M18 6 6 18M6 6l12 12",
};

/* ---------- animated counter, runs once when scrolled into view ---------- */

function CountUp({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * to));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ---------- data ---------- */

const NAV_LINKS = [
  { href: "#modules", label: "Modules" },
  { href: "#workflow", label: "How it works" },
  { href: "#roles", label: "Who it's for" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const MODULES = [
  {
    key: "academics",
    label: "Academics",
    title: "Africa-first academic structure, ready on day one",
    body: "Primary 1–6, JSS 1–3, SSS 1–3 out of the box, with class arms, subjects, and per-term teacher assignments. WAEC/NECO-style A–F grading and a full result-entry-to-report-card pipeline, including attendance counts and class position.",
    points: ["Academic sessions & terms", "Class levels & arms", "Auto-graded report cards"],
  },
  {
    key: "cbt",
    label: "CBT Engine",
    title: "Computer-Based Testing that's a first-class module",
    body: "A reusable question bank across multiple choice, true/false, fill-in-the-blank and theory. A real exam builder, timed exam-taking with per-student shuffling via a seeded PRNG, instant auto-grading for objective questions, and manual grading for theory answers.",
    points: ["Anti-cheating shuffled exams", "Instant objective auto-grading", "Manual theory grading queue"],
  },
  {
    key: "library",
    label: "Library",
    title: "Physical and digital lending in one catalog",
    body: "Track physical copies with borrow/return, due dates and automatic fine calculation on late return, alongside self-hosted ebook links — all tagged by target audience so the library stays relevant whether a Primary 3 pupil or an SSS 3 student is browsing.",
    points: ["Borrow/return with fine automation", "Physical + ebook catalog", "Primary vs. secondary tagging"],
  },
  {
    key: "fees",
    label: "Fees & Billing",
    title: "Fee structures, invoices, and payments — in Naira by default",
    body: "Fee structures roll up into invoices and payments, amounts stored in kobo to avoid floating-point errors. Naira as the default currency and Africa/Lagos timezone, with stubs ready for Paystack, Flutterwave, and Africa's Talking SMS.",
    points: ["Kobo-precise invoicing", "Paystack / Flutterwave ready", "Per-term fee structures"],
  },
  {
    key: "parents",
    label: "Parent Portal",
    title: "A real parent portal, not just a role flag",
    body: "Guardians get their own login, linked to one or more children, and can switch between them to monitor grades, attendance, teacher comments, assignments, CBT results, the school calendar, and fee history — with notifications firing automatically as things change.",
    points: ["Multi-child switching", "Automatic in-app notifications", "Fee & report card visibility"],
  },
  {
    key: "attendance",
    label: "Attendance & Calendar",
    title: "Daily attendance, a shared calendar, and announcements",
    body: "Teachers mark attendance per class per day; it rolls straight into report cards. A shared school calendar tracks holidays, exams and academic dates, and announcements are targeted by audience — all staff, all parents, or a specific school stage.",
    points: ["Daily attendance capture", "Shared academic calendar", "Audience-targeted announcements"],
  },
] as const;

const MODULE_LIST = MODULES;

const WORKFLOW_STEPS = [
  {
    title: "Register your school",
    body: "Create your school's isolated workspace in minutes — pick FREE, BASIC, or PREMIUM based on your student and staff seat count.",
    icon: icons.shield,
  },
  {
    title: "Bring your people in",
    body: "Add teachers, enroll students by class arm, and invite parents — guardians can be linked to more than one child automatically.",
    icon: icons.parents,
  },
  {
    title: "Run the term",
    body: "Take attendance, assign work, run CBT exams, issue invoices, and lend library books — all inside one shared platform.",
    icon: icons.bolt,
  },
  {
    title: "Report and repeat",
    body: "Report cards, fee histories, and CBT results roll up automatically, ready for the next term or academic session.",
    icon: icons.reports,
  },
];

const ROLES = [
  { role: "School Admin", detail: "Full control of the school's workspace — staff, students, fee structures, and settings." },
  { role: "Teacher", detail: "Attendance, results entry, question banks, exams, and assignments for assigned classes." },
  { role: "Student", detail: "Timed CBT exams, assignments, results, library, and the school calendar." },
  { role: "Parent", detail: "A dedicated portal to track every child's academics, attendance, fees, and announcements." },
  { role: "Librarian", detail: "Full catalog control, borrow/return processing, and automatic fine tracking." },
  { role: "Accountant", detail: "Fee structures, invoices, and payment records across the school." },
];

const PLANS = [
  {
    name: "Free",
    price: "₦0",
    cadence: "/ 30 days",
    blurb: "A 30-day trial to get a single class arm onto digital records.",
    features: ["Up to 50 students", "Core academics & attendance", "1 staff seat cap tier", "Community support"],
    cta: "Start for free",
  },
  {
    name: "Basic",
    price: "₦80,000",
    cadence: "/month",
    blurb: "For a full primary or secondary school running day-to-day.",
    features: ["Higher student & staff caps", "Full CBT engine", "Library + fee invoicing", "Email support"],
    cta: "Choose Basic",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "₦200,000",
    cadence: "/month",
    blurb: "For multi-arm schools that need the full ERP surface area.",
    features: ["Highest seat caps", "Parent Portal for every guardian", "Priority support", "Early access to new modules"],
    cta: "Choose Premium",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Report cards used to take my staff a full week at the end of term. Now attendance, results and the CBT scores roll up on their own — it's ready the day the term ends.",
    name: "Mrs. Adeyemi Fashola",
    role: "Principal, Demo Academy",
  },
  {
    quote:
      "Our parents finally see what's happening without calling the school office. Fee balances, report cards, announcements — all in one login for every one of their children.",
    name: "Chinedu Okafor",
    role: "School Administrator",
  },
  {
    quote:
      "The CBT engine alone replaced three different tools we were stitching together for mock exams — question bank, shuffled delivery, and instant grading in one place.",
    name: "Ifeoma Nwosu",
    role: "Vice Principal, Academics",
  },
];

const FAQS = [
  {
    q: "Is School Manager built for African schools specifically?",
    a: "Yes. Nigerian/West African curriculum structure (Primary 1–6, JSS 1–3, SSS 1–3) and WAEC/NECO-style A–F grading are the defaults, along with Naira currency, Africa/Lagos timezone, and local payment and SMS rails so intermittent connectivity and mobile-money billing aren't an afterthought.",
  },
  {
    q: "Can more than one school use the same platform?",
    a: "Yes — it's a true multi-tenant SaaS. Every school gets its own isolated workspace, and a platform-level Super Admin can manage every tenant from a single account.",
  },
  {
    q: "How does the CBT anti-cheating shuffle work?",
    a: "Question order and multiple-choice option order are shuffled per student using a seeded pseudo-random generator, so the shuffle is unique to each student but reproducible if they reload mid-exam — no lost progress, no easy answer-sharing.",
  },
  {
    q: "What happens if a parent has more than one child at the school?",
    a: "A guardian's login links to as many children as needed. Re-using the same guardian email at a new child's admission automatically links that child to the existing parent account instead of creating a duplicate.",
  },
  {
    q: "Can I change plans as my school grows?",
    a: "Yes. FREE, BASIC, and PREMIUM plans each carry a student and staff seat cap enforced at creation time — upgrade whenever you're ready to add more.",
  },
];

/* ---------- page ---------- */

export function LandingPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeModule, setActiveModule] = useState<string>(MODULE_LIST[0].key);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const active = MODULE_LIST.find((m) => m.key === activeModule) ?? MODULE_LIST[0];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ---------- nav ---------- */}
      <header
        className={`sticky top-0 z-40 transition ${
          scrolled ? "border-b border-[#E6E6E6] bg-white/90 backdrop-blur shadow-sm" : "border-b border-transparent bg-white/0"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2E3192] text-white">
              <Icon path={icons.academics} className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-[#2E3192]">School Manager</span>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-slate-600 transition hover:text-[#2E3192]">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="text-sm font-medium text-slate-700 transition hover:text-[#2E3192]">
              Sign in
            </Link>
            <Link
              to="/onboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2E3192] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Register your school
              <Icon path={icons.arrowRight} className="h-4 w-4" />
            </Link>
          </div>

          <button
            className="text-slate-700 md:hidden"
            aria-label="Toggle navigation menu"
            onClick={() => setNavOpen((o) => !o)}
          >
            <Icon path={navOpen ? icons.close : icons.menu} className="h-6 w-6" />
          </button>
        </div>

        {navOpen && (
          <div className="border-t border-[#E6E6E6] bg-white px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setNavOpen(false)}
                  className="rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-[#E6E6E6]"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-[#E6E6E6] pt-3">
                <Link to="/login" className="rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-[#E6E6E6]">
                  Sign in
                </Link>
                <Link
                  to="/onboard"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2E3192] px-4 py-2 text-sm font-semibold text-white"
                >
                  Register your school
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#D0E3FF] blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#81AEEB]/40 bg-[#D0E3FF] px-3 py-1 text-xs font-semibold text-[#2E3192]">
                <Icon path={icons.globe} className="h-3.5 w-3.5" />
                Built for African primary & secondary schools
              </span>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                One platform to run your <span className="text-[#2E3192]">entire school</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                Academics, computer-based testing, a library, fees, attendance, and a real parent portal — in one
                multi-tenant SaaS, with Nigerian curriculum structure, WAEC/NECO grading, and Naira billing built in
                from day one.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/onboard"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2E3192] px-6 py-3 text-base font-semibold text-white shadow-md transition hover:opacity-90 hover:shadow-lg"
                >
                  Register your school
                  <Icon path={icons.arrowRight} className="h-5 w-5" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-[#81AEEB] hover:text-[#2E3192]"
                >
                  Sign in to your school
                </Link>
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                <Icon path={icons.check} className="h-4 w-4 text-[#2E3192]" />
                No card required for the Free plan
              </div>
            </div>

            {/* interactive preview card */}
            <div className="relative">
              <div className="rounded-2xl border border-[#E6E6E6] bg-white p-2 shadow-2xl shadow-[#2E3192]/10">
                <div className="rounded-xl bg-[#E6E6E6]/50 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#81AEEB]" />
                    </div>
                    <span className="text-xs font-medium text-slate-400">Demo Academy — Term Overview</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Students enrolled", value: 842, tone: "bg-[#D0E3FF] text-[#2E3192]" },
                      { label: "Active exams", value: 6, tone: "bg-sky-50 text-sky-800" },
                      { label: "Fees collected", value: "₦4.2M", tone: "bg-amber-50 text-amber-800", raw: true },
                      { label: "Library titles", value: 1240, tone: "bg-violet-50 text-violet-800" },
                    ].map((stat) => (
                      <div key={stat.label} className={`rounded-lg p-3 ${stat.tone}`}>
                        <div className="text-xl font-bold">
                          {stat.raw ? stat.value : <CountUp to={stat.value as number} />}
                        </div>
                        <div className="mt-0.5 text-xs font-medium opacity-80">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2 rounded-lg bg-white p-3">
                    {["Result submitted — SS2 Chemistry", "Fee invoice paid — Fatima B.", "CBT exam graded — 48 students"].map((row) => (
                      <div key={row} className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#81AEEB]" />
                        {row}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* stat strip */}
          <div className="mt-16 grid grid-cols-2 gap-6 border-t border-[#E6E6E6] pt-10 sm:grid-cols-4">
            {[
              { to: 7, suffix: "", label: "User roles supported" },
              { to: 4, suffix: "", label: "Question types in the CBT engine" },
              { to: 3, suffix: "", label: "Subscription tiers" },
              { to: 100, suffix: "%", label: "Multi-tenant isolated data" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-extrabold text-[#2E3192] sm:text-4xl">
                  <CountUp to={s.to} suffix={s.suffix} />
                </div>
                <div className="mt-1 text-sm text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- modules (interactive tabs) ---------- */}
      <section id="modules" className="border-t border-[#E6E6E6] bg-[#E6E6E6]/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Every module a school needs, one login</h2>
            <p className="mt-4 text-lg text-slate-600">
              Explore what's inside — each module is production-built, not a placeholder.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[280px_1fr]">
            <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {MODULE_LIST.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setActiveModule(m.key)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition lg:shrink ${
                    activeModule === m.key
                      ? "border-[#81AEEB] bg-[#D0E3FF] text-[#2E3192] shadow-sm"
                      : "border-[#E6E6E6] bg-white text-slate-600 hover:border-[#81AEEB] hover:text-[#2E3192]"
                  }`}
                >
                  <Icon path={icons[m.key as keyof typeof icons]} className="h-5 w-5 shrink-0" />
                  {m.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-[#E6E6E6] bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-slate-900">{active.title}</h3>
              <p className="mt-4 text-base leading-relaxed text-slate-600">{active.body}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {active.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-slate-700">
                    <Icon path={icons.check} className="mt-0.5 h-4 w-4 shrink-0 text-[#2E3192]" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- workflow ---------- */}
      <section id="workflow" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">From sign-up to a running term</h2>
            <p className="mt-4 text-lg text-slate-600">Four steps, and the whole school is on one platform.</p>
          </div>

          <div className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-0 right-0 top-8 hidden h-px bg-slate-200 lg:block" aria-hidden="true" />
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.title} className="relative">
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-slate-50 bg-[#2E3192] text-white shadow-md">
                  <Icon path={step.icon} className="h-7 w-7" />
                </div>
                <div className="mt-5">
                  <div className="text-xs font-bold uppercase tracking-wide text-[#2E3192]">Step {i + 1}</div>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- roles ---------- */}
      <section id="roles" className="border-t border-[#E6E6E6] bg-[#E6E6E6]/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Built for everyone in the building</h2>
            <p className="mt-4 text-lg text-slate-600">Every role gets exactly the access it needs — nothing more.</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => (
              <div
                key={r.role}
                className="group rounded-2xl border border-[#E6E6E6] bg-white p-6 transition hover:-translate-y-1 hover:border-[#81AEEB] hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#D0E3FF] text-[#2E3192] transition group-hover:bg-[#2E3192] group-hover:text-white">
                  <Icon path={icons.parents} className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{r.role}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- testimonials (auto-rotating carousel) ---------- */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Trusted by school leaders</h2>
          </div>

          <div className="relative mt-12 min-h-[220px] rounded-2xl border border-[#E6E6E6] bg-white p-8 shadow-sm sm:p-10">
            {TESTIMONIALS.map((t, i) => (
              <blockquote
                key={t.name}
                className={`absolute inset-0 flex flex-col justify-center p-8 transition-opacity duration-700 sm:p-10 ${
                  i === testimonialIndex ? "relative opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <p className="text-lg leading-relaxed text-slate-700">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-6 text-sm font-semibold text-slate-900">
                  {t.name}
                  <span className="ml-2 font-normal text-slate-500">— {t.role}</span>
                </footer>
              </blockquote>
            ))}
          </div>

          <div className="mt-6 flex justify-center gap-2">
            {TESTIMONIALS.map((t, i) => (
              <button
                key={t.name}
                onClick={() => setTestimonialIndex(i)}
                aria-label={`Show testimonial ${i + 1}`}
                className={`h-2.5 rounded-full transition-all ${i === testimonialIndex ? "w-8 bg-[#2E3192]" : "w-2.5 bg-slate-300"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- pricing ---------- */}
      <section id="pricing" className="border-t border-[#E6E6E6] bg-[#E6E6E6]/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Plans that scale with your school</h2>
            <p className="mt-4 text-lg text-slate-600">Seat caps enforced automatically — upgrade the moment you need to.</p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  plan.highlighted
                    ? "border-[#81AEEB] bg-white shadow-xl ring-1 ring-[#81AEEB]/30 lg:-translate-y-2"
                    : "border-[#E6E6E6] bg-white shadow-sm"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2E3192] px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                  <span className="text-sm text-slate-500">{plan.cadence}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{plan.blurb}</p>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <Icon path={icons.check} className="mt-0.5 h-4 w-4 shrink-0 text-[#2E3192]" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/onboard"
                  className={`mt-8 inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    plan.highlighted
                      ? "bg-[#2E3192] text-white hover:opacity-90"
                      : "border border-slate-300 text-slate-700 hover:border-[#81AEEB] hover:text-[#2E3192]"
                  }`}
                >
                  {plan.cta}
                  <Icon path={icons.arrowRight} className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ (accordion) ---------- */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Frequently asked questions</h2>
          </div>

          <div className="mt-10 divide-y divide-[#E6E6E6] rounded-2xl border border-[#E6E6E6] bg-white">
            {FAQS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q}>
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                    aria-expanded={open}
                  >
                    <span className="text-base font-semibold text-slate-900">{item.q}</span>
                    <Icon
                      path={icons.chevronDown}
                      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180 text-[#2E3192]" : ""}`}
                    />
                  </button>
                  <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm leading-relaxed text-slate-600">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="border-t border-[#E6E6E6] bg-[#2E3192] py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to bring your school onto one platform?</h2>
          <p className="mt-4 text-lg text-[#D0E3FF]">
            Register your school in minutes, or sign in if your school already has an account.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/onboard"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-[#2E3192] shadow-md transition hover:bg-[#D0E3FF]"
            >
              Register your school
              <Icon path={icons.arrowRight} className="h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-[#81AEEB] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#81AEEB]/20"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="bg-slate-900 py-12 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2E3192] text-white">
                <Icon path={icons.academics} className="h-4 w-4" />
              </div>
              <span className="text-base font-bold text-white">School Manager</span>
            </div>
            <p className="text-sm">A Dafsolt Consult product, built for schools across Africa.</p>
            <div className="flex gap-6 text-sm">
              <Link to="/login" className="hover:text-white">
                Sign in
              </Link>
              <Link to="/onboard" className="hover:text-white">
                Register
              </Link>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-800 pt-6 text-center text-xs">
            © {new Date().getFullYear()} Dafsolt Consult. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
