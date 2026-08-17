import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { usePlatformAuth } from "../context/PlatformAuthContext";
import { PlatformRole } from "../types/platform";

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
  roles?: PlatformRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/platform", label: "Dashboard" },
  { to: "/platform/schools", label: "Schools" },
  { to: "/platform/school-groups", label: "School Groups" },
  { to: "/platform/admins", label: "Platform Admins", roles: ["OWNER"] },
  { to: "/platform/global-questions", label: "Exam Practice Library" },
  { to: "/platform/audit-log", label: "Audit Log" },
];

export function PlatformLayout() {
  const { admin, logout } = usePlatformAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  if (!admin) return null;

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(admin.role));

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 md:hidden"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 active:bg-slate-800"
        >
          <MenuIcon />
        </button>
        <p className="text-base font-bold text-white">Dafsolt BOS</p>
        <div className="h-11 w-11" aria-hidden />
      </header>

      <div className="flex flex-1 min-h-0">
        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileNavOpen(false)} aria-hidden />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-200 md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="min-w-0">
              <p className="text-lg font-bold text-white">Dafsolt BOS</p>
              <p className="truncate text-xs text-slate-400">Platform administration</p>
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 active:bg-slate-800 md:hidden"
            >
              <CloseIcon />
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/platform"}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-800"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-slate-800 p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <p className="text-sm font-medium text-white">
              {admin.firstName} {admin.lastName}
            </p>
            <p className="text-xs text-slate-400">{admin.role}</p>
            <button onClick={() => logout()} className="mt-2 text-xs font-medium text-red-400 active:underline hover:underline">
              Sign out
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
