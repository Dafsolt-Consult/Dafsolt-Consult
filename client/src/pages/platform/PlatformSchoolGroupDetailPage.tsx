import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { platformApi } from "../../api/platformClient";
import { apiErrorMessage } from "../../api/client";
import { Button, Card, ErrorBanner, Input, Label, Modal, PageHeader, Select, Table } from "../../components/ui";
import { usePlatformFetch } from "../../hooks/usePlatformFetch";
import { usePlatformAuth } from "../../context/PlatformAuthContext";
import { Paginated } from "../../types";
import { PlatformTenantRow, SchoolGroupDetail, SchoolGroupReport } from "../../types/platform";

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </Card>
  );
}

export function PlatformSchoolGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { admin } = usePlatformAuth();
  const canManage = admin?.role === "OWNER";

  const { data: group, loading, error, refetch } = usePlatformFetch<SchoolGroupDetail>(groupId ? `/school-groups/${groupId}` : null);
  const { data: report } = usePlatformFetch<SchoolGroupReport>(groupId ? `/school-groups/${groupId}/report` : null, [group?.tenants.length]);
  const { data: allTenants } = usePlatformFetch<Paginated<PlatformTenantRow>>("/tenants?pageSize=100");

  const [renaming, setRenaming] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const ungroupedTenants = allTenants?.items.filter((t) => !t.groupId) ?? [];

  async function addTenant() {
    if (!groupId || !selectedTenantId) return;
    setActionError(null);
    setAdding(true);
    try {
      await platformApi.post(`/school-groups/${groupId}/tenants`, { tenantId: selectedTenantId });
      setSelectedTenantId("");
      refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  async function removeTenant(tenantId: string) {
    setActionError(null);
    try {
      await platformApi.delete(`/school-groups/tenants/${tenantId}`);
      refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;
  if (error) return <ErrorBanner message={error} />;
  if (!group) return null;

  return (
    <div>
      <PageHeader
        title={group.name}
        subtitle={`${group.tenants.length} campuses`}
        actions={canManage ? <Button variant="secondary" onClick={() => setRenaming(true)}>Rename</Button> : undefined}
      />
      {actionError && (
        <div className="mb-4">
          <ErrorBanner message={actionError} />
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-slate-700">Consolidated report</h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total enrollment" value={report?.totals.totalEnrollment ?? "—"} />
        <StatTile label="Avg. attendance (30d)" value={report ? `${report.totals.averageAttendanceRate}%` : "—"} />
        <StatTile label="Fee collection rate" value={report ? `${report.totals.feeCollectionRate}%` : "—"} />
        <StatTile label="Fees billed / paid" value={report ? `${naira(report.totals.totalFeeBilled)} / ${naira(report.totals.totalFeePaid)}` : "—"} />
      </div>

      {report && report.campuses.length > 0 && (
        <div className="mb-6">
          <Table>
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Campus</th>
                <th className="px-4 py-3">Enrollment</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Fees billed</th>
                <th className="px-4 py-3">Fees paid</th>
                <th className="px-4 py-3">Collection rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.campuses.map((c) => (
                <tr key={c.tenantId}>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.tenantName}</td>
                  <td className="px-4 py-3 text-slate-600">{c.latestEnrollment}</td>
                  <td className="px-4 py-3 text-slate-600">{c.averageAttendanceRate}%</td>
                  <td className="px-4 py-3 text-slate-600">{naira(c.feeBilled)}</td>
                  <td className="px-4 py-3 text-slate-600">{naira(c.feePaid)}</td>
                  <td className="px-4 py-3 text-slate-600">{c.feeCollectionRate}%</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-slate-700">Campuses in this group</h2>
      <Table>
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">School</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Students</th>
            <th className="px-4 py-3">Staff</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {group.tenants.map((t) => (
            <tr key={t.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{t.name}</p>
                <p className="text-xs text-slate-400">{t.slug}</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{t.planTier}</td>
              <td className="px-4 py-3 text-slate-600">{t._count.students}</td>
              <td className="px-4 py-3 text-slate-600">{t._count.users}</td>
              <td className="px-4 py-3">
                {canManage && (
                  <Button variant="ghost" onClick={() => removeTenant(t.id)}>
                    Remove
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {!group.tenants.length && (
        <Card className="mt-4">
          <p className="text-sm text-slate-500">No campuses assigned to this group yet.</p>
        </Card>
      )}

      {canManage && (
        <Card className="mt-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Add a campus</h2>
          <div className="flex gap-2">
            <Select value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)} className="flex-1">
              <option value="">Select an ungrouped school...</option>
              {ungroupedTenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Button onClick={addTenant} disabled={!selectedTenantId || adding}>
              {adding ? "Adding..." : "Add"}
            </Button>
          </div>
          {!ungroupedTenants.length && <p className="mt-2 text-xs text-slate-400">Every school on the platform already belongs to a group.</p>}
        </Card>
      )}

      {renaming && (
        <RenameGroupModal
          groupId={group.id}
          currentName={group.name}
          onClose={() => setRenaming(false)}
          onRenamed={() => {
            setRenaming(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function RenameGroupModal({
  groupId,
  currentName,
  onClose,
  onRenamed,
}: {
  groupId: string;
  currentName: string;
  onClose: () => void;
  onRenamed: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await platformApi.patch(`/school-groups/${groupId}`, { name });
      onRenamed();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Rename group" onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Group name</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </Modal>
  );
}
