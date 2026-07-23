import { useState } from "react";
import { Link } from "react-router-dom";
import { platformApi } from "../../api/platformClient";
import { apiErrorMessage } from "../../api/client";
import { Card, ErrorBanner, PageHeader, Select, Table } from "../../components/ui";
import { usePlatformFetch } from "../../hooks/usePlatformFetch";
import { Paginated } from "../../types";
import { PlatformTenantRow } from "../../types/platform";
import { usePlatformAuth } from "../../context/PlatformAuthContext";

export function PlatformSchoolsPage() {
  const { admin } = usePlatformAuth();
  const { data, loading, error, refetch } = usePlatformFetch<Paginated<PlatformTenantRow>>("/tenants");
  const [saveError, setSaveError] = useState<string | null>(null);
  const canEditBilling = admin?.role === "OWNER";

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
                    className="w-28"
                  >
                    <option value="FREE">Free</option>
                    <option value="BASIC">Basic</option>
                    <option value="PREMIUM">Premium</option>
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
          <p className="text-sm text-slate-500">No schools have registered yet.</p>
        </Card>
      )}
    </div>
  );
}
