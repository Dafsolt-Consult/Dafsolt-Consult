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
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showCreate && <AdmitStudentModal onClose={() => setShowCreate(false)} onCreated={refetch} />}
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
      await api.post("/students", form);
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
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Admitting..." : "Admit student"}
        </Button>
      </form>
    </Modal>
  );
}
