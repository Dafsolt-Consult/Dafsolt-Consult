import { ReactNode } from "react";
import { Link } from "react-router-dom";

function ShieldMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
    </svg>
  );
}

/** An archway/gate silhouette — the visual anchor for every "entrance to
 * your school" screen (sign in, register). */
function GateMark() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12">
      <path d="M8 42V20a16 16 0 0 1 32 0v22" />
      <path d="M6 42h36" />
      <path d="M16 42V24" />
      <path d="M32 42V24" />
      <path d="M24 24v-7" />
      <circle cx="24" cy="14" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AuthGateShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#D0E3FF] blur-3xl" />
      </div>

      <header className="flex items-center justify-between px-4 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2E3192] text-white">
            <ShieldMark />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#2E3192]">Dafsolt BOS</span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-[#81AEEB] hover:text-[#2E3192]"
        >
          ← Back to home
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16 pt-4">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E6E6E6] bg-white shadow-xl shadow-[#2E3192]/10">
          <div className="flex flex-col items-center gap-2 bg-gradient-to-br from-[#2E3192] to-[#1B1D5C] px-8 py-9 text-center">
            <div className="text-[#D0E3FF]">
              <GateMark />
            </div>
            <h1 className="mt-1 text-xl font-bold text-white">{title}</h1>
            <p className="text-sm text-[#D0E3FF]">{subtitle}</p>
          </div>

          <div className="px-5 py-8 sm:px-8">{children}</div>
        </div>
      </main>

      {footer && <div className="pb-8 text-center text-xs text-slate-400">{footer}</div>}
    </div>
  );
}
