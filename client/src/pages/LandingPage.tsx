import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../hooks/useFetch";

/* ---------- small local icon set (no new dependency) ---------- */

function Icon({ path, className = "h-6 w-6" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}

const icons = {
  administration: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z",
  academics: "M12 3 1 8l11 5 9-4.09V15h2V8L12 3Zm-7 8.18V16c0 1.1 3.13 3 7 3s7-1.9 7-3v-4.82l-7 3.18-7-3.18Z",
  finance: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  people: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  communication:
    "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z",
  operations: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8Z",
  analytics: "M3 3v18h18M8 17V9m5 8V5m5 12v-5",
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
  { href: "#showcase", label: "See it live" },
  { href: "#pillars", label: "What's inside" },
  { href: "#roles", label: "Who it's for" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const SHOWCASE = [
  {
    key: "proprietor",
    persona: "Proprietor",
    title: "Proprietor Dashboard",
    body: "Enrollment trend, attendance rate, fee collection and exam performance — the whole school's health on one screen, updated the moment staff record anything.",
    image: "/screenshots/proprietor-dashboard.webp",
  },
  {
    key: "academic",
    persona: "Academic office",
    title: "Academic Dashboard",
    body: "Sessions, terms, class arms, subjects and exactly who teaches what, per term — the academic backbone every other module reads from.",
    image: "/screenshots/academic-dashboard.webp",
  },
  {
    key: "bursar",
    persona: "Bursar",
    title: "Bursar Dashboard",
    body: "Fee structures, invoices and payments per student, scholarships and discounts applied inline — nothing lives in a separate spreadsheet.",
    image: "/screenshots/bursar-dashboard.webp",
  },
  {
    key: "teacher",
    persona: "Teacher",
    title: "Teacher Dashboard",
    body: "CA and exam scores entered per class, auto-totalled and auto-graded the moment a teacher hits Save — no manual averaging, ever.",
    image: "/screenshots/teacher-dashboard.webp",
  },
  {
    key: "parent",
    persona: "Parent",
    title: "Parent Portal",
    body: "Attendance, class position, subject scores and teacher & principal comments — one login switches between every child a guardian has at the school.",
    image: "/screenshots/parent-portal.webp",
  },
] as const;

const PILLARS = [
  {
    key: "administration",
    label: "Administration",
    tagline: "The command center for the whole school",
    points: [
      "Multi-tenant workspace with fully isolated data per campus",
      "Student records, admissions & promotions",
      "Staff & teacher directory",
      "Class levels, arms & academic structure",
      "School Groups — run multiple campuses from one account",
      "Role-based access across 11 staff & family roles",
    ],
  },
  {
    key: "academics",
    label: "Academics",
    tagline: "Everything between the timetable and the report card",
    points: [
      "Academic sessions, terms & class arms",
      "Subjects & per-term teacher assignments",
      "Timetable builder",
      "Lesson plans",
      "CBT engine — question bank, exam builder, shuffled anti-cheat delivery, instant auto-grading",
      "Results entry & WAEC/NECO-style auto-graded report cards",
      "Library — physical lending plus an ebook catalog",
      "E-learning course materials & live classes",
      "Assignments, submissions & grading",
    ],
  },
  {
    key: "finance",
    label: "Finance",
    tagline: "Every naira, tracked from invoice to receipt",
    points: [
      "Fee structures by class, session & term",
      "Kobo-precise invoicing & payments",
      "Paystack / Flutterwave-ready",
      "Scholarships & discounts",
      "Inventory, assets & procurement spend",
    ],
  },
  {
    key: "people",
    label: "People",
    tagline: "Staff, students and everyone in between",
    points: [
      "HR & payroll — staff attendance, leave requests, payroll runs",
      "Staff performance reviews",
      "Alumni directory",
      "Health & medical records",
      "Disciplinary records",
      "Hostel / boarding management",
    ],
  },
  {
    key: "communication",
    label: "Communication",
    tagline: "Nobody finds out by phone call",
    points: [
      "Parent Portal — one login, every child",
      "Announcements targeted by audience",
      "In-app + SMS notifications (Africa's Talking-ready)",
      "Shared school calendar",
    ],
  },
  {
    key: "operations",
    label: "Operations",
    tagline: "The logistics that keep a campus running",
    points: [
      "Transport — routes, vehicles, drivers & student assignments",
      "Hostel — rooms, occupancy & boarding fees",
      "Inventory & asset maintenance",
      "Offline exam kiosk mode for CBT",
      "Compliance reporting",
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    tagline: "The proof, not just the promise",
    points: [
      "Enrollment trend across sessions",
      "Daily attendance rate, last 30 days",
      "Fee collection: billed vs. paid, by term",
      "Exam performance: average score & pass rate",
      "Full audit log",
    ],
  },
] as const;

const WORKFLOW_STEPS = [
  {
    title: "Register your school",
    body: "Create your school's isolated workspace in minutes — pick Starter, Growth, Professional or Enterprise based on your student count. Every plan gets the full Dafsolt BOS for School.",
    icon: icons.shield,
  },
  {
    title: "Bring your people in",
    body: "Add teachers, enroll students by class arm, and invite parents — guardians can be linked to more than one child automatically.",
    icon: icons.people,
  },
  {
    title: "Run the term",
    body: "Take attendance, assign work, run CBT exams, issue invoices, and lend library books — all inside one connected system.",
    icon: icons.bolt,
  },
  {
    title: "Report and repeat",
    body: "Report cards, fee histories, and CBT results roll up automatically, ready for the next term or academic session.",
    icon: icons.analytics,
  },
];

const ROLES = [
  { role: "Proprietor / School Admin", detail: "Full control of the school's workspace — staff, students, fee structures, and settings." },
  { role: "Bursar / Accountant", detail: "Fee structures, invoices, payments and scholarships across the school." },
  { role: "Teacher", detail: "Attendance, results entry, question banks, exams, and assignments for assigned classes." },
  { role: "Student", detail: "Timed CBT exams, assignments, results, library, and the school calendar." },
  { role: "Parent", detail: "A dedicated portal to track every child's academics, attendance, fees, and announcements." },
  { role: "HR Manager", detail: "Staff attendance, leave requests, payroll runs and performance reviews." },
];

function naira(n: number) {
  return `₦${n.toLocaleString()}`;
}

const INCLUDED_CATEGORIES = [
  "Academic Management",
  "Student & Parent Management",
  "Finance",
  "CBT & Examination",
  "HR & Payroll",
  "School Operations",
  "Communication",
  "Analytics",
  "E-Learning",
  "Multi-campus (higher plans)",
];

const PLANS = [
  {
    name: "Starter",
    students: "1–150 students",
    normalPrice: 75000,
    foundingPrice: 50000,
    annualNormal: 210000,
    blurb: "Nursery, primary or a small secondary school digitizing for the first time.",
    features: ["The complete Dafsolt BOS for School — every module included", "Up to 150 students", "Core admin seats", "Standard support"],
    cta: "Start on Starter",
  },
  {
    name: "Growth",
    students: "151–400 students",
    normalPrice: 150000,
    foundingPrice: 100000,
    annualNormal: 420000,
    blurb: "The plan most Nigerian private schools land on.",
    features: ["Everything in Starter", "Full CBT engine + global question library", "HR & payroll, transport, hostel, e-learning", "Priority support"],
    cta: "Start on Growth",
    highlighted: true,
  },
  {
    name: "Professional",
    students: "401–800 students",
    normalPrice: 250000,
    foundingPrice: 175000,
    annualNormal: 700000,
    blurb: "For larger schools that need more admin seats and deeper reporting.",
    features: ["Everything in Growth", "Advanced analytics & compliance reporting", "More admin users & storage", "School branding"],
    cta: "Start on Professional",
  },
  {
    name: "Enterprise",
    students: "801–1,500 students",
    normalPrice: 400000,
    foundingPrice: 280000,
    annualNormal: 1120000,
    blurb: "For large institutions that need dedicated support and tighter control.",
    features: ["Everything in Professional", "Dedicated onboarding", "Enhanced security controls", "Multi-campus ready"],
    cta: "Talk to sales",
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
    q: "What exactly is Dafsolt BOS for School?",
    a: "An operating system for running a school — not a single app bolted onto a spreadsheet. Administration, Academics, Finance, People, Communication, Operations and Analytics all read and write to the same data, so a result entered by a teacher is the same result a parent sees, the bursar bills against, and the proprietor's analytics chart counts.",
  },
  {
    q: "Is Dafsolt BOS for School built for African schools specifically?",
    a: "Yes. Nigerian/West African curriculum structure (Primary 1–6, JSS 1–3, SSS 1–3) and WAEC/NECO-style A–F grading are the defaults, along with Naira currency, Africa/Lagos timezone, and local payment and SMS rails so intermittent connectivity and mobile-money billing aren't an afterthought.",
  },
  {
    q: "Can more than one school use the same platform?",
    a: "Yes — it's a true multi-tenant SaaS. Every school gets its own isolated workspace, and School Groups let an operator running several campuses manage every one of them from a single account.",
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
    a: "Yes. Plans are keyed to your student count, so as you grow from Starter to Growth to Professional to Enterprise, you're upgrading capacity — not unlocking modules you were previously missing. School Groups running multiple campuses move to custom pricing.",
  },
];

/* ---------- page ---------- */

export function LandingPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeShowcase, setActiveShowcase] = useState<string>(SHOWCASE[0].key);
  const [activePillar, setActivePillar] = useState<string>(PILLARS[0].key);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const { data: signupStats } = useFetch<{ schoolsRegistered: number; foundingCohortSize: number }>("/public/signup-stats");
  const schoolsRegistered = signupStats?.schoolsRegistered ?? 0;
  const foundingCohortSize = signupStats?.foundingCohortSize ?? 1000;
  const foundingProgressPct = Math.min((schoolsRegistered / foundingCohortSize) * 100, 100);

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

  const activeShot = SHOWCASE.find((s) => s.key === activeShowcase) ?? SHOWCASE[0];
  const activePillarData = PILLARS.find((p) => p.key === activePillar) ?? PILLARS[0];

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
              <Icon path={icons.administration} className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#2E3192]">Dafsolt BOS</span>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-slate-600 transition hover:text-[#2E3192]">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <a href="/kiosk/login" className="text-sm font-medium text-slate-500 transition hover:text-[#2E3192]">
              Exam Kiosk
            </a>
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
                <a href="/kiosk/login" className="rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:bg-[#E6E6E6]">
                  Exam Kiosk
                </a>
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

        <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 text-center sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#81AEEB]/40 bg-[#D0E3FF] px-3 py-1 text-xs font-semibold text-[#2E3192]">
            <Icon path={icons.globe} className="h-3.5 w-3.5" />
            Dafsolt BOS for School
          </span>

          <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            The complete <span className="text-[#2E3192]">operating system</span> for your school
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Administration, Academics, Finance, People, Communication, Operations and Analytics — all connected through
            one system, so nothing lives in a separate spreadsheet again.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
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

          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Icon path={icons.check} className="h-4 w-4 text-[#2E3192]" />
            No card required for your 30-day guided trial
          </div>
        </div>
      </section>

      {/* ---------- live dashboard showcase ---------- */}
      <section id="showcase" className="border-t border-[#E6E6E6] bg-[#0B1220] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[#81AEEB]">
              Real screens, real data
            </span>
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">This is the actual software</h2>
            <p className="mt-4 text-lg text-slate-300">
              Not mockups — live screens from a running Dafsolt BOS for School, one per role. Pick a persona to see their screen.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {SHOWCASE.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveShowcase(s.key)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeShowcase === s.key
                    ? "border-[#81AEEB] bg-[#81AEEB]/15 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/30 hover:text-white"
                }`}
              >
                {s.persona}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
              <img
                src={activeShot.image}
                alt={`${activeShot.title} in Dafsolt BOS for School`}
                className="block w-full"
                loading="eager"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#81AEEB]">{activeShot.persona}</p>
              <h3 className="mt-2 text-2xl font-bold text-white">{activeShot.title}</h3>
              <p className="mt-4 text-base leading-relaxed text-slate-300">{activeShot.body}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- stat strip ---------- */}
      <section className="border-t border-[#E6E6E6] py-12">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
          {[
            { to: 7, suffix: "", label: "Connected pillars, one system" },
            { to: 20, suffix: "+", label: "Modules, from admission to graduation" },
            { to: 11, suffix: "", label: "Staff & family roles supported" },
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
      </section>

      {/* ---------- pillars (interactive tabs) ---------- */}
      <section id="pillars" className="border-t border-[#E6E6E6] bg-[#E6E6E6]/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Seven pillars. One system.</h2>
            <p className="mt-4 text-lg text-slate-600">
              Administration, Academics, Finance, People, Communication, Operations and Analytics — each one is a
              production-built module, and every one of them shares the same data.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[300px_1fr]">
            <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {PILLARS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setActivePillar(p.key)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition lg:shrink ${
                    activePillar === p.key
                      ? "border-[#81AEEB] bg-[#D0E3FF] text-[#2E3192] shadow-sm"
                      : "border-[#E6E6E6] bg-white text-slate-600 hover:border-[#81AEEB] hover:text-[#2E3192]"
                  }`}
                >
                  <Icon path={icons[p.key as keyof typeof icons]} className="h-5 w-5 shrink-0" />
                  {p.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-[#E6E6E6] bg-white p-8 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#2E3192]">{activePillarData.label}</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">{activePillarData.tagline}</h3>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {activePillarData.points.map((p) => (
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
            <p className="mt-4 text-lg text-slate-600">Four steps, and the whole school is on one system.</p>
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
            <p className="mt-4 text-lg text-slate-600">
              Every role gets exactly the access it needs — nothing more. Nurses, transport officers, librarians and
              hostel wardens get their own screens too.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => (
              <div
                key={r.role}
                className="group rounded-2xl border border-[#E6E6E6] bg-white p-6 transition hover:-translate-y-1 hover:border-[#81AEEB] hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#D0E3FF] text-[#2E3192] transition group-hover:bg-[#2E3192] group-hover:text-white">
                  <Icon path={icons.people} className="h-5 w-5" />
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
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">One system. One price. No feature toll-gates.</h2>
            <p className="mt-4 text-lg text-slate-600">
              Every plan includes the complete Dafsolt BOS for School. Plans scale by student count, admin seats, storage and
              support — never by which module you're allowed to use.
            </p>
          </div>

          <div className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2">
            {INCLUDED_CATEGORIES.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E6E6] bg-white px-3 py-1 text-xs font-medium text-slate-600"
              >
                <Icon path={icons.check} className="h-3.5 w-3.5 text-[#2E3192]" />
                {c}
              </span>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-[#81AEEB]/40 bg-[#2E3192] px-6 py-5 text-center sm:px-10">
            <p className="text-sm font-bold uppercase tracking-wide text-[#D0E3FF]">🎓 Dafsolt BOS Founding Schools Programme</p>
            <p className="mt-2 text-lg font-semibold text-white">
              The first 1,000 schools to register lock in the founding prices below for their first year.
            </p>
            <p className="mt-1 text-sm text-[#D0E3FF]">
              Free setup, free onboarding and free data migration — normally ₦50,000–₦100,000. After Year 1, standard
              pricing applies.
            </p>

            <div className="mx-auto mt-4 max-w-md">
              <div className="flex items-baseline justify-between text-xs font-semibold text-[#D0E3FF]">
                <span>
                  <CountUp to={schoolsRegistered} /> of {foundingCohortSize.toLocaleString()} founding spots claimed
                </span>
                <span>{Math.round(foundingProgressPct)}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700"
                  style={{ width: `${foundingProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-4">
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
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">{plan.students}</p>

                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-400 line-through">{naira(plan.normalPrice)}</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Founding price
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">{naira(plan.foundingPrice)}</span>
                    <span className="text-sm text-slate-500">/term</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Standard pricing: {naira(plan.normalPrice)}/term, or {naira(plan.annualNormal)}/year.
                  </p>
                </div>

                <p className="mt-4 text-sm text-slate-600">{plan.blurb}</p>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <Icon path={icons.check} className="mt-0.5 h-4 w-4 shrink-0 text-[#2E3192]" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to={`/onboard?plan=${plan.name.toLowerCase()}`}
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

          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#E6E6E6] bg-white p-8 text-center sm:flex-row sm:text-left">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">School Group — 1,500+ students or multiple campuses</h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Custom pricing based on campuses, total students, admin seats, storage, SLA and integrations — built on
                the same School Groups feature that lets one account run every campus.
              </p>
            </div>
            <a
              href="mailto:hello@dafsolt.com"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#81AEEB] hover:text-[#2E3192]"
            >
              Talk to us
              <Icon path={icons.arrowRight} className="h-4 w-4" />
            </a>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Icon path={icons.check} className="mt-0.5 h-4 w-4 shrink-0 text-[#2E3192]" />
              One school subscription — no per-teacher, per-parent or per-student account fees.
            </div>
            <div className="flex items-start gap-2">
              <Icon path={icons.check} className="mt-0.5 h-4 w-4 shrink-0 text-[#2E3192]" />
              Online payments are billed at the payment gateway's own rate, never a hidden Dafsolt BOS markup.
            </div>
            <div className="flex items-start gap-2">
              <Icon path={icons.check} className="mt-0.5 h-4 w-4 shrink-0 text-[#2E3192]" />
              SMS is usage-based — pay for bundles as you send them, not a flat "unlimited" tax.
            </div>
            <div className="flex items-start gap-2">
              <Icon path={icons.check} className="mt-0.5 h-4 w-4 shrink-0 text-[#2E3192]" />
              CBT, the question bank and every other module are included at every tier — never an add-on.
            </div>
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
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            From admission to graduation, Dafsolt BOS for School puts your entire school in one place.
          </h2>
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
                <Icon path={icons.administration} className="h-4 w-4" />
              </div>
              <span className="text-base font-bold text-white">Dafsolt BOS</span>
            </div>
            <p className="text-sm">Built for schools across Africa.</p>
            <div className="flex gap-6 text-sm">
              <Link to="/login" className="hover:text-white">
                Sign in
              </Link>
              <Link to="/onboard" className="hover:text-white">
                Register
              </Link>
              <a href="/kiosk/login" className="hover:text-white">
                Exam Kiosk Login
              </a>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-800 pt-6 text-center text-xs">
            © {new Date().getFullYear()} Dafsolt BOS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
