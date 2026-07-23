import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types";

interface NavItem {
  to: string;
  label: string;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT", "LIBRARIAN", "ACCOUNTANT"] },
  { to: "/", label: "Parent Portal", roles: ["PARENT"] },
  { to: "/students", label: "Students", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { to: "/teachers", label: "Teachers", roles: ["SCHOOL_ADMIN"] },
  { to: "/academics", label: "Classes & Subjects", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { to: "/timetable", label: "Timetable", roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT"] },
  { to: "/attendance", label: "Attendance", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { to: "/lesson-plans", label: "Lesson Plans", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { to: "/results", label: "Results", roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT"] },
  { to: "/fees", label: "Fees", roles: ["SCHOOL_ADMIN", "ACCOUNTANT", "STUDENT"] },
  { to: "/cbt/questions", label: "Question Bank", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { to: "/cbt/exams", label: "Exams", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { to: "/cbt/available", label: "My Exams", roles: ["STUDENT"] },
  { to: "/assignments", label: "Assignments", roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT"] },
  { to: "/calendar", label: "School Calendar", roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT"] },
  { to: "/announcements", label: "Announcements", roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT"] },
  { to: "/library/books", label: "Library", roles: ["SCHOOL_ADMIN", "TEACHER", "STUDENT", "LIBRARIAN"] },
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
      <div className="flex flex-1">
        <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="text-lg font-bold text-brand-700">School Manager</p>
            {user.tenant && <p className="truncate text-xs text-slate-500">{user.tenant.name}</p>}
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-800">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500">{user.role.replace("_", " ")}</p>
            <button onClick={() => logout()} className="mt-2 text-xs font-medium text-red-600 hover:underline">
              Sign out
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
