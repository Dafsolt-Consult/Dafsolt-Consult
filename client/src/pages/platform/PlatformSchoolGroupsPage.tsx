import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { platformApi } from "../../api/platformClient";
import { apiErrorMessage } from "../../api/client";
import { Button, Card, ErrorBanner, Input, Label, Modal, PageHeader, Table } from "../../components/ui";
import { usePlatformFetch } from "../../hooks/usePlatformFetch";
import { usePlatformAuth } from "../../context/PlatformAuthContext";
import { SchoolGroupRow } from "../../types/platform";

export function PlatformSchoolGroupsPage() {
  const { admin } = usePlatformAuth();
  const { data: groups, loading, error, refetch } = usePlatformFetch<SchoolGroupRow[]>("/school-groups");
  const [creating, setCreating] = useState(false);
  const canManage = admin?.role === "OWNER";

  return (
    <div>
      <PageHeader
        title="School Groups"
        subtitle={`${groups?.length ?? 0} groups — consolidated reporting across a customer's campuses`}
        actions={canManage ? <Button onClick={() => setCreating(true)}>New group</Button> : undefined}
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3">Campuses</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups?.map((g) => (
              <tr key={g.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{g.name}</td>
                <td className="px-4 py-3 text-slate-600">{g._count.tenants}</td>
                <td className="px-4 py-3">
                  <Link to={`/platform/school-groups/${g.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {!loading && !groups?.length && (
        <Card className="mt-4">
          <p className="text-sm text-slate-500">
            No school groups yet. Create one to link multiple campuses run by the same customer under a single
            consolidated report.
          </p>
        </Card>
      )}
      {creating && (
        <CreateGroupModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await platformApi.post("/school-groups", { name });
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New school group" onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Group name</Label>
          <Input required placeholder="e.g. Royal Group of Schools" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating..." : "Create group"}
        </Button>
      </form>
    </Modal>
  );
}
