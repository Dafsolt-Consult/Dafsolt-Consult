import { NavLink, Outlet } from "react-router-dom";
import { usePlatformAuth } from "../context/PlatformAuthContext";
import { PlatformRole } from "../types/platform";

interface NavItem {
  to: string;
  label: string;
  roles?: PlatformRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/platform", label: "Dashboard" },
  { to: "/platform/schools", label: "Schools" },
  { to: "/platform/admins", label: "Platform Admins", roles: ["OWNER"] },
  { to: "/platform/global-questions", label: "Exam Practice Library" },
  { to: "/platform/audit-log", label: "Audit Log" },
];

export function PlatformLayout() {
  const { admin, logout } = usePlatformAuth();
  if (!admin) return null;

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(admin.role));

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-5 py-4">
          <p className="text-lg font-bold text-white">School Manager</p>
          <p className="truncate text-xs text-slate-400">Platform administration</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/platform"}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <p className="text-sm font-medium text-white">
            {admin.firstName} {admin.lastName}
          </p>
          <p className="text-xs text-slate-400">{admin.role}</p>
          <button onClick={() => logout()} className="mt-2 text-xs font-medium text-red-400 hover:underline">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <Outlet />
      </main>
    </div>
  );
}
