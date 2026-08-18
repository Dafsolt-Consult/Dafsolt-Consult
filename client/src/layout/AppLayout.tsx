import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types";
import { AssistantChatWidget } from "../components/AssistantChatWidget";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-6 w-6">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

interface NavItem {
  to: string;
  label: string;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT", "LIBRARIAN", "ACCOUNTANT", "NURSE", "HR_MANAGER", "TRANSPORT_OFFICER", "HOSTEL_WARDEN"],
  },
  { to: "/", label: "Parent Portal", roles: ["PARENT"] },
  { to: "/students", label: "Students", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { to: "/students/promotions", label: "Promotions", roles: ["SCHOOL_ADMIN"] },
  { to: "/teachers", label: "Teachers", roles: ["SCHOOL_ADMIN"] },
  { to: "/academics", label: "Classes & Subjects", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { to: "/timetable", label: "Timetable", roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT"] },
  { to: "/attendance", label: "Attendance", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { to: "/lesson-plans", label: "Lesson Plans", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { to: "/results", label: "Results", roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT"] },
  { to: "/fees", label: "Fees", roles: ["SCHOOL_ADMIN", "ACCOUNTANT", "STUDENT"] },
  { to: "/cbt/questions", label: "Question Bank", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { to: "/cbt/exams", label: "Exams", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { to: "/cbt/available", label: "My CBT Exams", roles: ["STUDENT"] },
  { to: "/cbt/practice", label: "CBT Practice", roles: ["STUDENT"] },
  { to: "/assignments", label: "Assignments", roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT"] },
  { to: "/elearning", label: "E-Learning", roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT"] },
  { to: "/alumni", label: "Alumni", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { to: "/disciplinary-records", label: "Disciplinary Records", roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT"] },
  { to: "/health-records", label: "Health Records", roles: ["SCHOOL_ADMIN", "NURSE", "TEACHER", "STUDENT"] },
  {
    to: "/calendar",
    label: "School Calendar",
    roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT", "LIBRARIAN", "ACCOUNTANT", "NURSE", "HR_MANAGER", "TRANSPORT_OFFICER", "HOSTEL_WARDEN"],
  },
  {
    to: "/announcements",
    label: "Announcements",
    roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT", "LIBRARIAN", "ACCOUNTANT", "NURSE", "HR_MANAGER", "TRANSPORT_OFFICER", "HOSTEL_WARDEN"],
  },
  { to: "/library/books", label: "Library", roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT", "LIBRARIAN", "PARENT"] },
  { to: "/library/borrow-records", label: "Borrow Records", roles: ["SCHOOL_ADMIN", "LIBRARIAN"] },
  { to: "/notifications", label: "Notifications" },
  { to: "/analytics", label: "Analytics & Reporting", roles: ["SCHOOL_ADMIN"] },
  { to: "/compliance", label: "Compliance Reports", roles: ["SCHOOL_ADMIN"] },
  { to: "/settings", label: "Settings", roles: ["SCHOOL_ADMIN"] },
  { to: "/transport", label: "Transport", roles: ["SCHOOL_ADMIN", "TRANSPORT_OFFICER", "STUDENT", "PARENT"] },
  { to: "/hostel", label: "Hostel", roles: ["SCHOOL_ADMIN", "HOSTEL_WARDEN", "STUDENT", "PARENT"] },
  {
    to: "/hr",
    label: "HR & Payroll",
    roles: ["SCHOOL_ADMIN", "HR_MANAGER", "TEACHER", "LIBRARIAN", "ACCOUNTANT", "NURSE", "TRANSPORT_OFFICER", "HOSTEL_WARDEN"],
  },
  { to: "/inventory", label: "Inventory & Assets", roles: ["SCHOOL_ADMIN", "ACCOUNTANT"] },
];

function ImpersonationBanner({ onExit }: { onExit: () => void }) {
  return (
    <div className="flex items-center justify-between bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <span>Viewing as this school, impersonated by a platform admin. Actions here are audit-logged.</span>
      <button onClick={onExit} className="rounded bg-amber-950/10 px-3 py-1 font-semibold hover:bg-amber-950/20">
        Exit impersonation
      </button>
    </div>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  async function exitImpersonation() {
    await logout();
    // Impersonation sessions are always opened in a new tab (see
    // PlatformSchoolDetailPage) — closing it returns to the platform admin
    // tab. Falls back to /login if the tab wasn't script-opened (e.g. the
    // user bookmarked/reloaded it) since window.close() is then a no-op.
    window.close();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen flex-col">
      {user.impersonatedBy && <ImpersonationBanner onExit={exitImpersonation} />}

      {/* Below md, the sidebar becomes a slide-in drawer opened from this
          bar instead of a permanently docked column — a fixed w-64 sidebar
          would eat most of a 360-390px phone width otherwise. */}
      <header
        className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 active:bg-slate-100"
        >
          <MenuIcon />
        </button>
        <p className="text-base font-bold text-brand-700">Dafsolt BOS</p>
        <div className="h-11 w-11" aria-hidden />
      </header>

      <div className="flex flex-1 min-h-0">
        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileNavOpen(false)} aria-hidden />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <p className="text-lg font-bold text-brand-700">Dafsolt BOS</p>
              {user.tenant && <p className="truncate text-xs text-slate-500">{user.tenant.name}</p>}
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 active:bg-slate-100 md:hidden"
            >
              <CloseIcon />
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 active:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          {(user.role === "SCHOOL_ADMIN" || user.role === "TEACHER") && (
            <div className="border-t border-slate-200 p-3">
              <a
                href="/kiosk/login"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 active:bg-slate-100"
              >
                <span>CBT Exam Kiosk</span>
                <span className="text-xs text-slate-400">Opens in new tab ↗</span>
              </a>
            </div>
          )}
          <div className="border-t border-slate-200 p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <p className="text-sm font-medium text-slate-800">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500">{user.role.replace("_", " ")}</p>
            <button onClick={() => logout()} className="mt-2 text-xs font-medium text-red-600 active:underline hover:underline">
              Sign out
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <AssistantChatWidget />
    </div>
  );
}
