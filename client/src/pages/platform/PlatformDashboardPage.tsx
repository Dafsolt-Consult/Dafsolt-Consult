import { Link } from "react-router-dom";
import { Card, PageHeader } from "../../components/ui";
import { usePlatformAuth } from "../../context/PlatformAuthContext";
import { usePlatformFetch } from "../../hooks/usePlatformFetch";
import { Paginated } from "../../types";
import { PlatformTenantRow, SchoolGroupRow } from "../../types/platform";

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

const FOUNDING_COHORT_SIZE = 1000;

export function PlatformDashboardPage() {
  const { admin } = usePlatformAuth();
  const { data } = usePlatformFetch<Paginated<PlatformTenantRow>>("/tenants?pageSize=1");
  const { data: groups } = usePlatformFetch<SchoolGroupRow[]>("/school-groups");
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
    </div>
  );
}
