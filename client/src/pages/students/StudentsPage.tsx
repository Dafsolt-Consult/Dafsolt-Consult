import { FormEvent, useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner, Table } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { useClassArms, useSessions } from "../../hooks/useAcademics";
import { Paginated, Student } from "../../types";
import { useAuth } from "../../context/AuthContext";

export function StudentsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [guardianTarget, setGuardianTarget] = useState<Student | null>(null);
  const { data, loading, error, refetch } = useFetch<Paginated<Student>>(`/students?search=${encodeURIComponent(search)}`, [search]);

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${data?.total ?? 0} enrolled`}
        actions={
          user?.role === "SCHOOL_ADMIN" ? (
            <Button onClick={() => setShowCreate(true)}>+ Admit student</Button>
          ) : undefined
        }
      />

      <div className="mb-4 max-w-xs">
        <Input placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !data?.items.length ? (
        <EmptyState message="No students found." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Admission No.</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              {user?.role === "SCHOOL_ADMIN" && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {s.user.firstName} {s.user.lastName}
                </td>
                <td className="px-4 py-3 text-slate-600">{s.admissionNumber}</td>
                <td className="px-4 py-3 text-slate-600">
                  {s.enrollments?.[0]?.classArm ? `${s.enrollments[0].classArm.classLevel.name} ${s.enrollments[0].classArm.name}` : "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{s.user.email}</td>
                <td className="px-4 py-3">
                  <Badge tone={s.status === "ACTIVE" ? "success" : "default"}>{s.status}</Badge>
                </td>
                {user?.role === "SCHOOL_ADMIN" && (
                  <td className="px-4 py-3">
                    <Button variant="ghost" onClick={() => setGuardianTarget(s)}>
                      Add guardian
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showCreate && <AdmitStudentModal onClose={() => setShowCreate(false)} onCreated={refetch} />}
      {guardianTarget && (
        <AddGuardianModal
          student={guardianTarget}
          onClose={() => setGuardianTarget(null)}
          onAdded={() => {
            refetch();
            setGuardianTarget(null);
          }}
        />
      )}
    </div>
  );
}

function AdmitStudentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: sessions } = useSessions();
  const { data: classArms } = useClassArms();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    admissionNumber: "",
    classArmId: "",
    sessionId: "",
  });
  const [guardian, setGuardian] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    relationship: "",
    email: "",
  });
  const [createParentLogin, setCreateParentLogin] = useState(false);
  const [guardianPassword, setGuardianPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateGuardian<K extends keyof typeof guardian>(key: K, value: string) {
    setGuardian((g) => ({ ...g, [key]: value }));
  }

  const hasGuardianInfo = guardian.firstName || guardian.lastName || guardian.phone;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/students", {
        ...form,
        guardian: hasGuardianInfo
          ? {
              ...guardian,
              email: guardian.email || undefined,
              password: createParentLogin ? guardianPassword : undefined,
            }
          : undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Admit a new student" onClose={onClose}>
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
          <Label>Admission number</Label>
          <Input required value={form.admissionNumber} onChange={(e) => update("admissionNumber", e.target.value)} />
        </div>
        <div>
          <Label>Session</Label>
          <Select required value={form.sessionId} onChange={(e) => update("sessionId", e.target.value)}>
            <option value="">Select session</option>
            {sessions?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Class</Label>
          <Select required value={form.classArmId} onChange={(e) => update("classArmId", e.target.value)}>
            <option value="">Select class</option>
            {classArms?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.classLevel?.name} {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Parent / guardian (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Guardian first name" value={guardian.firstName} onChange={(e) => updateGuardian("firstName", e.target.value)} />
            <Input placeholder="Guardian last name" value={guardian.lastName} onChange={(e) => updateGuardian("lastName", e.target.value)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input placeholder="Phone" value={guardian.phone} onChange={(e) => updateGuardian("phone", e.target.value)} />
            <Input placeholder="Relationship (e.g. Mother)" value={guardian.relationship} onChange={(e) => updateGuardian("relationship", e.target.value)} />
          </div>
          <div className="mt-3">
            <Input type="email" placeholder="Guardian email" value={guardian.email} onChange={(e) => updateGuardian("email", e.target.value)} />
          </div>

          {hasGuardianInfo && (
            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={createParentLogin} onChange={(e) => setCreateParentLogin(e.target.checked)} />
                Create a Parent Portal login for this guardian
              </label>
              {createParentLogin && (
                <div className="mt-2">
                  <Label>Parent portal password</Label>
                  <Input
                    type="password"
                    required={createParentLogin}
                    minLength={8}
                    value={guardianPassword}
                    onChange={(e) => setGuardianPassword(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-slate-400">Requires a guardian email above to sign in with.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Admitting..." : "Admit student"}
        </Button>
      </form>
    </Modal>
  );
}

function AddGuardianModal({ student, onClose, onAdded }: { student: Student; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", relationship: "", email: "" });
  const [createParentLogin, setCreateParentLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/students/${student.id}/guardians`, {
        ...form,
        email: form.email || undefined,
        password: createParentLogin ? password : undefined,
      });
      onAdded();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Add guardian for ${student.user.firstName} ${student.user.lastName}`} onClose={onClose}>
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Phone</Label>
            <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Relationship</Label>
            <Input required placeholder="e.g. Father" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={createParentLogin} onChange={(e) => setCreateParentLogin(e.target.checked)} />
          Create a Parent Portal login
        </label>
        {createParentLogin && (
          <div>
            <Label>Parent portal password</Label>
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1 text-xs text-slate-400">
              If this email already has a parent login (e.g. a sibling's guardian), it will be linked to this child too.
            </p>
          </div>
        )}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : "Add guardian"}
        </Button>
      </form>
    </Modal>
  );
}
