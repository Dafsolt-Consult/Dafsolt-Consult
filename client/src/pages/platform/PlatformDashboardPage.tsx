import { Link } from "react-router-dom";
import { Card, PageHeader } from "../../components/ui";
import { usePlatformAuth } from "../../context/PlatformAuthContext";
import { usePlatformFetch } from "../../hooks/usePlatformFetch";
import { Paginated } from "../../types";
import { PlatformTenantRow } from "../../types/platform";

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

export function PlatformDashboardPage() {
  const { admin } = usePlatformAuth();
  const { data } = usePlatformFetch<Paginated<PlatformTenantRow>>("/tenants?pageSize=1");
  if (!admin) return null;

  return (
    <div>
      <PageHeader title={`Welcome, ${admin.firstName}`} subtitle={`Platform administration · ${admin.role}`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Schools on the platform" value={data?.total ?? "—"} to="/platform/schools" />
        {admin.role === "OWNER" && <StatCard label="Platform admins" value="Manage" to="/platform/admins" />}
        <StatCard label="Audit log" value="Review" to="/platform/audit-log" />
      </div>
    </div>
  );
}
