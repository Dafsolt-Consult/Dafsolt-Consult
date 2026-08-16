import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Card, EmptyState, PageHeader } from "../../components/ui";
import { usePlatformAuth } from "../../context/PlatformAuthContext";
import { usePlatformFetch } from "../../hooks/usePlatformFetch";
import { Paginated } from "../../types";
import { PlatformTenantRow, SchoolGroupRow } from "../../types/platform";

// Same validated palette used by the tenant-side Analytics & Reporting page
// (client/src/pages/analytics/AnalyticsPage.tsx) — kept identical so charts
// read as one system across the app.
const BRAND_GREEN = "#16a34a";
const SERIES_BLUE = "#2a78d6";
const GRID = "#e1e0d9";
const AXIS = "#898781";

function StatCard({ label, value, to }: { label: string; value: string | number; to: string }) {
  return (
    <Link to={to}>
      <Card className="hover:border-slate-400">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </Card>
    </Link>
  );
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

function monthLabel(iso: string) {
  const [year, month] = iso.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
  SCHOOL_GROUP: "School Group",
};

const STATUS_TONE: Record<string, "default" | "success" | "warning" | "danger"> = {
  TRIALING: "warning",
  ACTIVE: "success",
  PAST_DUE: "danger",
  CANCELED: "default",
};

interface AnalyticsOverview {
  signupTrend: { month: string; count: number }[];
  planDistribution: { planTier: string; count: number }[];
  subscriptionStatusDistribution: { status: string; count: number }[];
  totals: { schools: number; students: number; staff: number };
  estimatedRevenuePerTerm: { totalKobo: number; schoolsIncluded: number; schoolsExcluded: number };
  trialsEndingSoon: {
    id: string;
    name: string;
    slug: string;
    planTier: string;
    trialEndsAt: string;
    _count: { students: number; users: number };
  }[];
}

const FOUNDING_COHORT_SIZE = 1000;

export function PlatformDashboardPage() {
  const { admin } = usePlatformAuth();
  const { data } = usePlatformFetch<Paginated<PlatformTenantRow>>("/tenants?pageSize=1");
  const { data: groups } = usePlatformFetch<SchoolGroupRow[]>("/school-groups");
  const { data: overview, loading: overviewLoading } = usePlatformFetch<AnalyticsOverview>("/analytics/overview");
  if (!admin) return null;

  const schoolsRegistered = data?.total ?? 0;
  const foundingProgress = Math.min((schoolsRegistered / FOUNDING_COHORT_SIZE) * 100, 100);

  return (
    <div>
      <PageHeader title={`Welcome, ${admin.firstName}`} subtitle={`Platform administration · ${admin.role}`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Schools on the platform" value={data?.total ?? "—"} to="/platform/schools" />
        <StatCard label="School groups" value={groups?.length ?? "—"} to="/platform/school-groups" />
        {admin.role === "OWNER" && <StatCard label="Platform admins" value="Manage" to="/platform/admins" />}
        <StatCard label="Audit log" value="Review" to="/platform/audit-log" />
      </div>

      <Card className="mt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-slate-700">Founding Schools Programme cohort</p>
          <p className="text-sm text-slate-500">
            {schoolsRegistered.toLocaleString()} / {FOUNDING_COHORT_SIZE.toLocaleString()} signups
          </p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${foundingProgress}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Every school that registers counts toward the first 1,000 — the same number shown live on the marketing site.
        </p>
      </Card>

      {overviewLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading business overview...</p>
      ) : overview ? (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Business overview</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-slate-500">Est. revenue per term</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{naira(overview.estimatedRevenuePerTerm.totalKobo)}</p>
              <p className="mt-1 text-xs text-slate-400">
                {overview.estimatedRevenuePerTerm.schoolsIncluded} schools at Founding pricing
                {overview.estimatedRevenuePerTerm.schoolsExcluded > 0 &&
                  ` · ${overview.estimatedRevenuePerTerm.schoolsExcluded} custom-priced (excluded)`}
                . Not real billing — Paystack/Flutterwave aren't live yet.
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Students across the platform</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{overview.totals.students.toLocaleString()}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Staff accounts across the platform</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{overview.totals.staff.toLocaleString()}</p>
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 font-medium text-slate-800">Signups, last 12 months</h3>
              {overview.signupTrend.every((m) => m.count === 0) ? (
                <EmptyState message="No signups yet in this window." />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.signupTrend.map((m) => ({ ...m, label: monthLabel(m.month) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} />
                      <YAxis tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="New schools" fill={BRAND_GREEN} radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-3 font-medium text-slate-800">Schools by plan</h3>
              {!overview.planDistribution.length ? (
                <EmptyState message="No schools yet." />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.planDistribution.map((p) => ({ ...p, label: PLAN_LABELS[p.planTier] ?? p.planTier }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} />
                      <YAxis tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Schools" fill={SERIES_BLUE} radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <Card className="mt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-slate-800">Trials ending in the next 7 days</h3>
              <span className="text-xs text-slate-400">{overview.trialsEndingSoon.length} to follow up</span>
            </div>
            {!overview.trialsEndingSoon.length ? (
              <EmptyState message="No trials expiring this week." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-2 py-1">School</th>
                      <th className="px-2 py-1">Plan</th>
                      <th className="px-2 py-1">Students</th>
                      <th className="px-2 py-1">Trial ends</th>
                      <th className="px-2 py-1" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overview.trialsEndingSoon.map((t) => (
                      <tr key={t.id}>
                        <td className="px-2 py-2 font-medium text-slate-800">{t.name}</td>
                        <td className="px-2 py-2 text-slate-600">{PLAN_LABELS[t.planTier] ?? t.planTier}</td>
                        <td className="px-2 py-2 text-slate-600">{t._count.students}</td>
                        <td className="px-2 py-2 text-slate-600">{new Date(t.trialEndsAt).toLocaleDateString()}</td>
                        <td className="px-2 py-2">
                          <Link to={`/platform/schools/${t.id}`} className="font-medium text-brand-700 hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="mt-4">
            <h3 className="mb-3 font-medium text-slate-800">Subscription status</h3>
            <div className="flex flex-wrap gap-3">
              {overview.subscriptionStatusDistribution.map((s) => (
                <div key={s.status} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <Badge tone={STATUS_TONE[s.status] ?? "default"}>{s.status.replace("_", " ")}</Badge>
                  <span className="text-sm font-semibold text-slate-800">{s.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
