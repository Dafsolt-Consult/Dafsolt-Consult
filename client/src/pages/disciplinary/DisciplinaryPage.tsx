import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { DisciplinaryCategory, DisciplinaryRecord, Paginated, Student } from "../../types";

const CATEGORY_TONE: Record<DisciplinaryCategory, "default" | "warning" | "danger"> = {
  MINOR: "default",
  MAJOR: "warning",
  SEVERE: "danger",
};

export function DisciplinaryPage() {
  const { user } = useAuth();
  if (user?.role === "STUDENT") {
    return (
      <div>
        <PageHeader title="Conduct Record" subtitle="Your disciplinary record for this school" />
        <StudentRecords studentId="me" />
      </div>
    );
  }
  return <StaffDisciplinaryView />;
}

function StaffDisciplinaryView() {
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<DisciplinaryRecord | null>(null);

  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (status) query.set("status", status);

  const { data: records, loading, error, refetch } = useFetch<DisciplinaryRecord[]>(
    `/disciplinary-records?${query.toString()}`,
    [category, status]
  );

  return (
    <div>
      <PageHeader
        title="Disciplinary Records"
        subtitle="Log and track student conduct incidents"
        actions={<Button onClick={() => setShowCreate(true)}>+ Log incident</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select className="max-w-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          <option value="MINOR">Minor</option>
          <option value="MAJOR">Major</option>
          <option value="SEVERE">Severe</option>
        </Select>
        <Select className="max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
        </Select>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !records?.length ? (
        <EmptyState message="No disciplinary records yet." />
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <Card key={r.id} className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-800">
                  {r.student?.user.firstName} {r.student?.user.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  <Badge tone={CATEGORY_TONE[r.category]}>{r.category}</Badge>{" "}
                  <Badge tone={r.status === "OPEN" ? "warning" : "success"}>{r.status}</Badge> ·{" "}
                  {new Date(r.incidentDate).toLocaleDateString()}
                </p>
                <p className="mt-1 text-sm text-slate-600">{r.description}</p>
                {r.actionTaken && (
                  <p className="mt-1 text-sm text-slate-500">
                    <span className="font-medium">Action taken:</span> {r.actionTaken}
                  </p>
                )}
              </div>
              <Button variant="secondary" onClick={() => setEditing(r)}>
                Edit
              </Button>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <RecordFormModal title="Log an incident" onClose={() => setShowCreate(false)} onSaved={refetch} />}
      {editing && (
        <RecordFormModal title="Edit record" record={editing} onClose={() => setEditing(null)} onSaved={refetch} />
      )}
    </div>
  );
}

function RecordFormModal({
  title,
  record,
  onClose,
  onSaved,
}: {
  title: string;
  record?: DisciplinaryRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId] = useState(record?.studentId ?? "");
  const { data: students } = useFetch<Paginated<Student>>(
    !record && studentSearch ? `/students?search=${encodeURIComponent(studentSearch)}` : null,
    [studentSearch]
  );
  const [form, setForm] = useState({
    category: record?.category ?? "MINOR",
    incidentDate: record ? record.incidentDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    description: record?.description ?? "",
    actionTaken: record?.actionTaken ?? "",
    status: record?.status ?? "OPEN",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!record && !studentId) {
      setError("Search for and select a student first");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (record) {
        await api.patch(`/disciplinary-records/${record.id}`, {
          category: form.category,
          incidentDate: form.incidentDate,
          description: form.description,
          actionTaken: form.actionTaken || undefined,
          status: form.status,
        });
      } else {
        await api.post("/disciplinary-records", {
          studentId,
          category: form.category,
          incidentDate: form.incidentDate,
          description: form.description,
          actionTaken: form.actionTaken || undefined,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!record && (
          <div>
            <Label>Student</Label>
            <Input
              placeholder="Search by name or email..."
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setStudentId("");
              }}
            />
            {students && students.items.length > 0 && !studentId && (
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1">
                {students.items.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      setStudentId(s.id);
                      setStudentSearch(`${s.user.firstName} ${s.user.lastName}`);
                    }}
                    className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-50"
                  >
                    {s.user.firstName} {s.user.lastName} · {s.admissionNumber}
                  </button>
                ))}
              </div>
            )}
            {studentId && <p className="mt-1 text-sm text-brand-700">Selected: {studentSearch}</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as DisciplinaryCategory })}>
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
            rows={3}
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <Label>Action taken</Label>
          <textarea
            rows={2}
            value={form.actionTaken}
            onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        {record && (
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "OPEN" | "RESOLVED" })}>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
            </Select>
          </div>
        )}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </Modal>
  );
}

/** Read-only record list, reused by the student's own view and the parent
 * portal's per-child tab. */
export function StudentRecords({ studentId }: { studentId: string }) {
  const { data: records, loading } = useFetch<DisciplinaryRecord[]>(`/disciplinary-records/students/${studentId}`, [studentId]);

  if (loading) return <Spinner />;
  if (!records?.length) return <EmptyState message="No disciplinary records." />;

  return (
    <div className="space-y-2">
      {records.map((r) => (
        <Card key={r.id}>
          <p className="text-sm text-slate-500">
            <Badge tone={CATEGORY_TONE[r.category]}>{r.category}</Badge>{" "}
            <Badge tone={r.status === "OPEN" ? "warning" : "success"}>{r.status}</Badge> ·{" "}
            {new Date(r.incidentDate).toLocaleDateString()}
          </p>
          <p className="mt-1 text-sm text-slate-600">{r.description}</p>
          {r.actionTaken && (
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-medium">Action taken:</span> {r.actionTaken}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
