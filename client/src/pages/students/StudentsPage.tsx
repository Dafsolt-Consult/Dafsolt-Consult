import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner, Table } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { useClassArms, useSessions } from "../../hooks/useAcademics";
import { DisciplinaryRecord, Paginated, Student } from "../../types";
import { useAuth } from "../../context/AuthContext";

export function StudentsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [guardianTarget, setGuardianTarget] = useState<Student | null>(null);
  const [disciplineTarget, setDisciplineTarget] = useState<Student | null>(null);
  const { data, loading, error, refetch } = useFetch<Paginated<Student>>(`/students?search=${encodeURIComponent(search)}`, [search]);

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${data?.total ?? 0} enrolled`}
        actions={
          user?.role === "SCHOOL_ADMIN" ? (
            <div className="flex gap-2">
              <Link to="/students/promotions">
                <Button variant="secondary">Promote students</Button>
              </Link>
              <Button onClick={() => setShowCreate(true)}>+ Admit student</Button>
            </div>
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
              {(user?.role === "SCHOOL_ADMIN" || user?.role === "TEACHER") && <th className="px-4 py-3"></th>}
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
                {(user?.role === "SCHOOL_ADMIN" || user?.role === "TEACHER") && (
                  <td className="space-x-2 px-4 py-3">
                    {user.role === "SCHOOL_ADMIN" && (
                      <Button variant="ghost" onClick={() => setGuardianTarget(s)}>
                        Add guardian
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => setDisciplineTarget(s)}>
                      Discipline
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
      {disciplineTarget && <DisciplinaryRecordsModal student={disciplineTarget} onClose={() => setDisciplineTarget(null)} />}
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

const CATEGORY_TONE: Record<string, "default" | "warning" | "danger"> = {
  MINOR: "default",
  MAJOR: "warning",
  SEVERE: "danger",
};

function DisciplinaryRecordsModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const { data: records, loading, error, refetch } = useFetch<DisciplinaryRecord[]>(`/disciplinary-records?studentId=${student.id}`);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "MINOR", incidentDate: "", description: "", actionTaken: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post("/disciplinary-records", { ...form, studentId: student.id, actionTaken: form.actionTaken || undefined });
      setForm({ category: "MINOR", incidentDate: "", description: "", actionTaken: "" });
      setShowForm(false);
      refetch();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function resolveRecord(recordId: string) {
    await api.patch(`/disciplinary-records/${recordId}`, { status: "RESOLVED" });
    refetch();
  }

  return (
    <Modal title={`Disciplinary records — ${student.user.firstName} ${student.user.lastName}`} onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {loading ? (
        <Spinner />
      ) : (
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {!records?.length && !showForm && <EmptyState message="No disciplinary records for this student." />}
          {records?.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge tone={CATEGORY_TONE[r.category]}>{r.category}</Badge>
                  <span className="text-slate-500">{new Date(r.incidentDate).toLocaleDateString()}</span>
                </div>
                {r.status === "OPEN" ? (
                  <Button variant="ghost" onClick={() => resolveRecord(r.id)}>
                    Mark resolved
                  </Button>
                ) : (
                  <Badge tone="success">RESOLVED</Badge>
                )}
              </div>
              <p className="mt-2 text-slate-700">{r.description}</p>
              {r.actionTaken && <p className="mt-1 text-slate-500">Action taken: {r.actionTaken}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {formError && <ErrorBanner message={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="MINOR">Minor</option>
                <option value="MAJOR">Major</option>
                <option value="SEVERE">Severe</option>
              </Select>
            </div>
            <div>
              <Label>Incident date</Label>
              <Input
                type="date"
                required
                value={form.incidentDate}
                onChange={(e) => setForm({ ...form, incidentDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <textarea
              required
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Action taken (optional)</Label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.actionTaken}
              onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save record"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button className="mt-4" onClick={() => setShowForm(true)}>
          + Log incident
        </Button>
      )}
    </Modal>
  );
}
