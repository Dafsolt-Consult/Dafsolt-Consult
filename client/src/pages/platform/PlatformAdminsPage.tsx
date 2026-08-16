import { FormEvent, useState } from "react";
import { platformApi } from "../../api/platformClient";
import { apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, ErrorBanner, Input, Label, Modal, PageHeader, Select, Table } from "../../components/ui";
import { usePlatformFetch } from "../../hooks/usePlatformFetch";
import { usePlatformAuth } from "../../context/PlatformAuthContext";
import { PlatformAdminUser, PlatformRole } from "../../types/platform";

export function PlatformAdminsPage() {
  const { admin: currentAdmin } = usePlatformAuth();
  const { data: admins, loading, error, refetch } = usePlatformFetch<PlatformAdminUser[]>("/admins");
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleActive(admin: PlatformAdminUser) {
    setActionError(null);
    try {
      await platformApi.patch(`/admins/${admin.id}`, { isActive: !admin.isActive });
      refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  }

  async function changeRole(admin: PlatformAdminUser, role: PlatformRole) {
    setActionError(null);
    try {
      await platformApi.patch(`/admins/${admin.id}`, { role });
      refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Platform admins"
        subtitle={`${admins?.length ?? 0} accounts`}
        actions={<Button onClick={() => setCreating(true)}>New admin</Button>}
      />
      {error && <ErrorBanner message={error} />}
      {actionError && (
        <div className="mb-4">
          <ErrorBanner message={actionError} />
        </div>
      )}
      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins?.map((a) => {
              const isSelf = a.id === currentAdmin?.id;
              return (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {a.firstName} {a.lastName} {isSelf && <span className="text-xs text-slate-400">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.email}</td>
                  <td className="px-4 py-3">
                    <Select value={a.role} disabled={isSelf} onChange={(e) => changeRole(a, e.target.value as PlatformRole)} className="w-40">
                      <option value="OWNER">Owner</option>
                      <option value="SUPPORT">Support</option>
                      <option value="BILLING">Billing</option>
                      <option value="CONTENT_MANAGER">Content Manager</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={a.isActive ? "success" : "danger"}>{a.isActive ? "Active" : "Deactivated"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : "Never"}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" disabled={isSelf} onClick={() => toggleActive(a)}>
                      {a.isActive ? "Deactivate" : "Reactivate"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      {creating && (
        <CreateAdminModal
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

function CreateAdminModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<PlatformRole>("SUPPORT");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await platformApi.post("/admins", { email, password, firstName, lastName, role });
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New platform admin" onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First name</Label>
            <Input required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label>Last name</Label>
            <Input required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label>Temporary password</Label>
          <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <Label>Role</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value as PlatformRole)}>
            <option value="SUPPORT">Support — read schools, start impersonation sessions</option>
            <option value="BILLING">Billing — manage subscriptions/plans, view revenue analytics</option>
            <option value="CONTENT_MANAGER">Content Manager — manage the exam-practice question library</option>
            <option value="OWNER">Owner — full access</option>
          </Select>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating..." : "Create admin"}
        </Button>
      </form>
    </Modal>
  );
}
