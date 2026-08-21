import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { platformApi } from "../../api/platformClient";
import { apiErrorMessage } from "../../api/client";
import { Card, ErrorBanner, Input, PageHeader, Pagination, Select, Table } from "../../components/ui";
import { usePlatformFetch } from "../../hooks/usePlatformFetch";
import { Paginated } from "../../types";
import { PlatformTenantRow } from "../../types/platform";
import { usePlatformAuth } from "../../context/PlatformAuthContext";

function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function PlatformSchoolsPage() {
  const { admin } = usePlatformAuth();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);
  const pageSize = 20;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, planFilter, statusFilter]);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (planFilter) params.set("planTier", planFilter);
    if (statusFilter) params.set("subscriptionStatus", statusFilter);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return `/tenants?${params.toString()}`;
  }, [debouncedSearch, planFilter, statusFilter, page]);

  const { data, loading, error, refetch } = usePlatformFetch<Paginated<PlatformTenantRow>>(url);
  const [saveError, setSaveError] = useState<string | null>(null);
  const canEditBilling = admin?.role === "OWNER" || admin?.role === "BILLING";

  async function updateSubscription(tenantId: string, patch: Record<string, string>) {
    setSaveError(null);
    try {
      await platformApi.patch(`/tenants/${tenantId}/subscription`, patch);
      refetch();
    } catch (err) {
      setSaveError(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="Schools on the platform" subtitle={`${data?.total ?? 0} schools registered`} />
      {error && <ErrorBanner message={error} />}
      {saveError && (
        <div className="mb-4">
          <ErrorBanner message={saveError} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search by name or URL slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="w-44">
          <option value="">All plans</option>
          <option value="STARTER">Starter</option>
          <option value="GROWTH">Growth</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="ENTERPRISE">Enterprise</option>
          <option value="SCHOOL_GROUP">School Group</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          <option value="TRIALING">Trialing</option>
          <option value="ACTIVE">Active</option>
          <option value="PAST_DUE">Past due</option>
          <option value="CANCELED">Canceled</option>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.slug}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{t.country}</td>
                <td className="px-4 py-3 text-slate-600">{t._count.students}</td>
                <td className="px-4 py-3 text-slate-600">{t._count.users}</td>
                <td className="px-4 py-3">
                  <Select
                    value={t.planTier}
                    disabled={!canEditBilling}
                    onChange={(e) => updateSubscription(t.id, { planTier: e.target.value })}
                    className="w-36"
                  >
                    <option value="STARTER">Starter</option>
                    <option value="GROWTH">Growth</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                    <option value="SCHOOL_GROUP">School Group</option>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={t.subscriptionStatus}
                    disabled={!canEditBilling}
                    onChange={(e) => updateSubscription(t.id, { subscriptionStatus: e.target.value })}
                    className="w-32"
                  >
                    <option value="TRIALING">Trialing</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PAST_DUE">Past due</option>
                    <option value="CANCELED">Canceled</option>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/platform/schools/${t.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {!loading && !data?.items.length && (
        <Card className="mt-4">
          <p className="text-sm text-slate-500">
            {search || planFilter || statusFilter ? "No schools match these filters." : "No schools have registered yet."}
          </p>
        </Card>
      )}
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
    </div>
  );
}
