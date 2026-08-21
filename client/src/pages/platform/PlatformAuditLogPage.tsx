import { useEffect, useMemo, useState } from "react";
import { Badge, Card, ErrorBanner, PageHeader, Pagination, Select, Table } from "../../components/ui";
import { usePlatformFetch } from "../../hooks/usePlatformFetch";
import { Paginated } from "../../types";
import { PlatformAuditLogEntry, PlatformTenantRow } from "../../types/platform";

export function PlatformAuditLogPage() {
  const [tenantId, setTenantId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: tenants } = usePlatformFetch<Paginated<PlatformTenantRow>>("/tenants?pageSize=200");

  useEffect(() => {
    setPage(1);
  }, [tenantId]);

  const url = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (tenantId) params.set("tenantId", tenantId);
    return `/audit-log?${params.toString()}`;
  }, [tenantId, page]);

  const { data, loading, error } = usePlatformFetch<Paginated<PlatformAuditLogEntry>>(url);

  return (
    <div>
      <PageHeader title="Platform audit log" subtitle={`${data?.total ?? 0} entries`} />
      {error && <ErrorBanner message={error} />}

      <div className="mb-4 flex flex-wrap gap-3">
        <Select className="w-64" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
          <option value="">All schools</option>
          {tenants?.items.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">Platform admin</th>
              <th className="px-4 py-3">Acting as</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-3 text-slate-600">{new Date(entry.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Badge>{entry.action}</Badge>
                  <p className="mt-1 text-xs text-slate-400">{entry.entityType}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{entry.tenant ? entry.tenant.name : "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {entry.platformAdmin ? `${entry.platformAdmin.firstName} ${entry.platformAdmin.lastName}` : "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {!loading && !data?.items.length && (
        <Card className="mt-4">
          <p className="text-sm text-slate-500">{tenantId ? "No audit activity for this school yet." : "No audit activity yet."}</p>
        </Card>
      )}
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
    </div>
  );
}
