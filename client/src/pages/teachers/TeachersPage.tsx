import { FormEvent, useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner, Table } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";

interface TeacherRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  teacher?: { staffId: string; qualification?: string | null } | null;
}

export function TeachersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<TeacherRow | null>(null);
  const { data, loading, error, refetch } = useFetch<TeacherRow[]>("/users");

  return (
    <div>
      <PageHeader title="Staff" subtitle={`${data?.length ?? 0} staff members`} actions={<Button onClick={() => setShowCreate(true)}>+ Add staff</Button>} />

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !data?.length ? (
        <EmptyState message="No staff members yet." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Staff ID</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {t.firstName} {t.lastName}
                </td>
                <td className="px-4 py-3 text-slate-600">{t.role.replace("_", " ")}</td>
                <td className="px-4 py-3 text-slate-600">{t.teacher?.staffId ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{t.email}</td>
                <td className="px-4 py-3">
                  <Badge tone={t.isActive ? "success" : "default"}>{t.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" onClick={() => setEditTarget(t)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showCreate && <AddStaffModal onClose={() => setShowCreate(false)} onCreated={refetch} />}
      {editTarget && (
        <EditStaffModal
          staff={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            refetch();
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}

function AddStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "TEACHER",
    staffId: "",
    qualification: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/users", form);
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add a staff member" onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First name</Label>
            <Input required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
          </div>
          <div>
            <Label>Last name</Label>
            <Input required value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div>
          <Label>Temporary password</Label>
          <Input type="password" required minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} />
        </div>
        <div>
          <Label>Role</Label>
          <Select required value={form.role} onChange={(e) => update("role", e.target.value)}>
            <option value="TEACHER">Teacher</option>
            <option value="LIBRARIAN">Librarian</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="SCHOOL_ADMIN">School Admin</option>
            <option value="NURSE">Nurse</option>
            <option value="HR_MANAGER">HR Manager</option>
            <option value="TRANSPORT_OFFICER">Transport Officer</option>
            <option value="HOSTEL_WARDEN">Hostel Warden</option>
          </Select>
        </div>
        {form.role === "TEACHER" && (
          <>
            <div>
              <Label>Staff ID</Label>
              <Input value={form.staffId} onChange={(e) => update("staffId", e.target.value)} />
            </div>
            <div>
              <Label>Qualification</Label>
              <Input value={form.qualification} onChange={(e) => update("qualification", e.target.value)} />
            </div>
          </>
        )}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Adding..." : "Add staff member"}
        </Button>
      </form>
    </Modal>
  );
}

function EditStaffModal({ staff, onClose, onSaved }: { staff: TeacherRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    firstName: staff.firstName,
    lastName: staff.lastName,
    phone: staff.phone ?? "",
    isActive: staff.isActive,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.patch(`/users/${staff.id}`, { ...form, phone: form.phone || undefined });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit ${staff.firstName} ${staff.lastName}`} onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First name</Label>
            <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <Label>Last name</Label>
            <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          Active (inactive staff cannot sign in)
        </label>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </Modal>
  );
}
