import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../context/AuthContext";
import { Badge, Card, EmptyState, Spinner } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { AuthUser, Announcement, CalendarEvent, CalendarEventType, Paginated, Student, Teacher, UserRole } from "../types";
import { navGroupsForRole } from "../layout/AppLayout";
import { DEFAULT_SECTION_THEME, SECTION_THEME, AttendanceStatIcon, FeesStatIcon, TrendIcon, UsersStatIcon } from "../components/dashboardIcons";
import { ParentPage } from "./parent/ParentPage";

const BLUE = "#2563eb";
const GREEN = "#16a34a";
const GRID = "#e2e8f0";

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

const ROLE_META: Partial<Record<UserRole, { label: string; gradient: string }>> = {
  SCHOOL_ADMIN: { label: "School Administrator", gradient: "from-emerald-600 via-emerald-500 to-teal-500" },
  TEACHER: { label: "Teacher", gradient: "from-blue-600 via-blue-500 to-indigo-500" },
  STUDENT: { label: "Student", gradient: "from-violet-600 via-fuchsia-500 to-pink-500" },
  LIBRARIAN: { label: "Librarian", gradient: "from-amber-600 via-amber-500 to-orange-500" },
  ACCOUNTANT: { label: "Accountant", gradient: "from-emerald-700 via-teal-600 to-cyan-600" },
  NURSE: { label: "School Nurse", gradient: "from-rose-600 via-pink-500 to-fuchsia-500" },
  HR_MANAGER: { label: "HR Manager", gradient: "from-indigo-600 via-blue-500 to-sky-500" },
  TRANSPORT_OFFICER: { label: "Transport Officer", gradient: "from-sky-600 via-cyan-500 to-teal-500" },
  HOSTEL_WARDEN: { label: "Hostel Warden", gradient: "from-purple-600 via-violet-500 to-indigo-500" },
};

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "PARENT") return <ParentPage />;

  return (
    <div>
      <DashboardHeader user={user} />
      {user.role === "SCHOOL_ADMIN" && <AdminOverview role={user.role} />}
      {user.role === "TEACHER" && <RoleOverview role={user.role} />}
      {user.role === "STUDENT" && <RoleOverview role={user.role} />}
      {user.role === "NURSE" && <RoleOverview role={user.role} />}
      {user.role === "HR_MANAGER" && <RoleOverview role={user.role} />}
      {user.role === "TRANSPORT_OFFICER" && <RoleOverview role={user.role} />}
      {user.role === "HOSTEL_WARDEN" && <RoleOverview role={user.role} />}
      {user.role === "LIBRARIAN" && <RoleOverview role={user.role} />}
      {user.role === "ACCOUNTANT" && <RoleOverview role={user.role} />}
    </div>
  );
}

function DashboardHeader({ user }: { user: AuthUser }) {
  const meta = ROLE_META[user.role] ?? { label: user.role.replace(/_/g, " "), gradient: "from-slate-700 via-slate-600 to-slate-500" };
  const today = new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const initials = `${user.firstName[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div className={`mb-6 overflow-hidden rounded-2xl bg-gradient-to-br ${meta.gradient} px-6 py-6 text-white shadow-sm sm:px-8 sm:py-7`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-semibold ring-1 ring-white/30">
          {initials}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-white/70">{today}</p>
          <h1 className="text-2xl font-semibold">Welcome, {user.firstName}</h1>
          <p className="mt-0.5 text-sm text-white/80">
            {user.tenant?.name}
            {user.tenant?.name ? " · " : ""}
            {meta.label}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, iconWrap, label, value, to }: { icon: ReactNode; iconWrap: string; label: string; value: string | number; to?: string }) {
  const content = (
    <Card className="flex items-center gap-4 transition hover:border-slate-300 hover:shadow-md">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm leading-snug text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold text-slate-900">{value}</p>
      </div>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

interface AnalyticsOverview {
  enrollmentTrend: { session: string; count: number }[];
  attendanceTrend: { date: string; rate: number }[];
  feeCollectionByTerm: { term: string; billed: number; paid: number; rate: number }[];
  examPerformance: { examTitle: string; attempts: number; averageScore: number; passRate: number }[];
}

function AdminOverview({ role }: { role: UserRole }) {
  const { data: overview, loading } = useFetch<AnalyticsOverview>("/analytics/overview");
  const { data: students } = useFetch<Paginated<Student>>("/students?pageSize=1");
  const { data: teachers } = useFetch<Teacher[]>("/teachers");

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAttendance = overview?.attendanceTrend.find((d) => d.date === todayStr);
  const totalBilled = overview?.feeCollectionByTerm.reduce((s, t) => s + t.billed, 0) ?? 0;
  const totalPaid = overview?.feeCollectionByTerm.reduce((s, t) => s + t.paid, 0) ?? 0;
  const overallFeeRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 1000) / 10 : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<UsersStatIcon />} iconWrap="bg-blue-50 text-blue-600" label="Students" value={students?.total ?? "—"} to="/students" />
        <StatCard icon={<UsersStatIcon />} iconWrap="bg-violet-50 text-violet-600" label="Teachers" value={teachers?.length ?? "—"} to="/teachers" />
        <StatCard
          icon={<AttendanceStatIcon />}
          iconWrap="bg-amber-50 text-amber-600"
          label="Today's Attendance"
          value={todayAttendance ? `${todayAttendance.rate}%` : "Not marked yet"}
          to="/attendance"
        />
        <StatCard
          icon={<FeesStatIcon />}
          iconWrap="bg-emerald-50 text-emerald-600"
          label="Fee Collection Rate"
          value={overallFeeRate !== null ? `${overallFeeRate}%` : "—"}
          to="/fees"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-700">Attendance — last 30 days</p>
          {loading ? (
            <Spinner />
          ) : overview && overview.attendanceTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={overview.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={36} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Area type="monotone" dataKey="rate" name="Attendance rate" stroke={BLUE} fill={BLUE} fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No attendance recorded yet." />
          )}
        </Card>

        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-700">Fee collection by term</p>
          {loading ? (
            <Spinner />
          ) : overview && overview.feeCollectionByTerm.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={overview.feeCollectionByTerm}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="term" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={44} tickFormatter={(v: number) => `${Math.round(v / 100000)}k`} />
                <Tooltip formatter={(v) => naira(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="billed" name="Billed" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" name="Collected" fill={GREEN} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No fee structures billed for the current session yet." />
          )}
        </Card>
      </div>

      {overview && overview.examPerformance.length > 0 && (
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-700">Recent exam performance</p>
          <div className="space-y-3">
            {overview.examPerformance.slice(0, 5).map((exam) => (
              <div key={exam.examTitle} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <TrendIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-800">{exam.examTitle}</p>
                    <span className="shrink-0 text-xs text-slate-500">{exam.attempts} attempts</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, exam.passRate)}%` }} />
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-slate-600">{exam.passRate}% pass</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <QuickActionsSection role={role} />
      <UpdatesPanel />
    </div>
  );
}

function RoleOverview({ role }: { role: UserRole }) {
  return (
    <div className="space-y-6">
      <QuickActionsSection role={role} />
      <UpdatesPanel />
    </div>
  );
}

function QuickActionsSection({ role }: { role: UserRole }) {
  const groups = navGroupsForRole(role).filter((g) => g.section);

  if (groups.length === 0) return null;

  return (
    <Card>
      <p className="mb-4 text-sm font-semibold text-slate-700">Everything available to you</p>
      <div className="space-y-5">
        {groups.map((group) => {
          const theme = (group.section && SECTION_THEME[group.section]) || DEFAULT_SECTION_THEME;
          const Icon = theme.icon;
          return (
            <div key={group.section}>
              <div className="mb-2 flex items-center gap-2">
                <Icon className={`h-4 w-4 ${theme.headerText}`} />
                <p className={`text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}>{group.section}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`rounded-lg border bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition ${theme.chip}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

const EVENT_TONE: Record<CalendarEventType, "default" | "success" | "warning" | "danger"> = {
  HOLIDAY: "warning",
  EXAM: "danger",
  ACADEMIC: "default",
  EVENT: "success",
  MEETING: "default",
};

function UpdatesPanel() {
  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { data: announcements, loading: loadingAnnouncements } = useFetch<Announcement[]>("/announcements");
  const { data: events, loading: loadingEvents } = useFetch<CalendarEvent[]>(
    `/calendar?from=${today.toISOString().slice(0, 10)}&to=${in30Days.toISOString().slice(0, 10)}`
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <p className="mb-3 text-sm font-semibold text-slate-700">Recent announcements</p>
        {loadingAnnouncements ? (
          <Spinner />
        ) : announcements && announcements.length > 0 ? (
          <ul className="space-y-3">
            {announcements.slice(0, 4).map((a) => (
              <li key={a.id} className="border-l-2 border-amber-400 pl-3">
                <p className="text-sm font-medium text-slate-800">{a.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{a.body}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(a.publishedAt).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No announcements yet." />
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-slate-700">Upcoming — next 30 days</p>
        {loadingEvents ? (
          <Spinner />
        ) : events && events.length > 0 ? (
          <ul className="space-y-3">
            {events.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{e.title}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(e.startDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                </div>
                <Badge tone={EVENT_TONE[e.type]}>{e.type.replace("_", " ")}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="Nothing on the calendar in the next 30 days." />
        )}
      </Card>
    </div>
  );
}
