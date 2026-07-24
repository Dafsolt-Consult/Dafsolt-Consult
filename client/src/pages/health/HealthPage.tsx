import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { HealthIncident, HealthRecord, Paginated, Student } from "../../types";

export function HealthPage() {
  const { user } = useAuth();
  if (user?.role === "STUDENT") {
    return (
      <div>
        <PageHeader title="Health Record" subtitle="Your medical profile and clinic visit history" />
        <StudentHealthView studentId="me" />
      </div>
    );
  }
  return <StaffHealthView />;
}

function StudentSearch({ onSelect }: { onSelect: (student: Student) => void }) {
  const [search, setSearch] = useState("");
  const { data: students } = useFetch<Paginated<Student>>(
    search ? `/students?search=${encodeURIComponent(search)}` : null,
    [search]
  );

  return (
    <div>
      <Input placeholder="Search by name or admission number..." value={search} onChange={(e) => setSearch(e.target.value)} />
      {students && students.items.length > 0 && (
        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1">
          {students.items.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => {
                onSelect(s);
                setSearch("");
              }}
              className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-50"
            >
              {s.user.firstName} {s.user.lastName} · {s.admissionNumber}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StaffHealthView() {
  const [studentFilter, setStudentFilter] = useState<Student | null>(null);
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const query = new URLSearchParams();
  if (studentFilter) query.set("studentId", studentFilter.id);

  const { data: incidents, loading, error, refetch } = useFetch<HealthIncident[]>(
    `/health-records?${query.toString()}`,
    [studentFilter]
  );

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Health & Medical Records"
          subtitle="Clinic visit log and student medical profiles"
          actions={<Button onClick={() => setShowCreate(true)}>+ Log incident</Button>}
        />

        <div className="mb-4 max-w-sm">
          {studentFilter ? (
            <div className="flex items-center gap-2">
              <Badge>
                {studentFilter.user.firstName} {studentFilter.user.lastName}
              </Badge>
              <Button variant="secondary" onClick={() => setStudentFilter(null)}>
                Clear filter
              </Button>
            </div>
          ) : (
            <StudentSearch onSelect={setStudentFilter} />
          )}
        </div>

        {error && <ErrorBanner message={error} />}
        {loading ? (
          <Spinner />
        ) : !incidents?.length ? (
          <EmptyState message="No clinic visits logged yet." />
        ) : (
          <div className="space-y-2">
            {incidents.map((i) => (
              <Card key={i.id}>
                <p className="font-medium text-slate-800">
                  {i.student?.user.firstName} {i.student?.user.lastName}
                </p>
                <p className="text-sm text-slate-500">{new Date(i.incidentDate).toLocaleDateString()}</p>
                <p className="mt-1 text-sm text-slate-600">{i.description}</p>
                {i.actionTaken && (
                  <p className="mt-1 text-sm text-slate-500">
                    <span className="font-medium">Action taken:</span> {i.actionTaken}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card>
        <h3 className="mb-3 font-medium text-slate-800">Student medical profile</h3>
        {profileStudent ? (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Badge>
                {profileStudent.user.firstName} {profileStudent.user.lastName}
              </Badge>
              <Button variant="secondary" onClick={() => setProfileStudent(null)}>
                Change student
              </Button>
            </div>
            <ProfileForm studentId={profileStudent.id} />
          </div>
        ) : (
          <StudentSearch onSelect={setProfileStudent} />
        )}
      </Card>

      {showCreate && <IncidentFormModal onClose={() => setShowCreate(false)} onSaved={refetch} />}
    </div>
  );
}

function ProfileForm({ studentId }: { studentId: string }) {
  const { data: record, loading, refetch } = useFetch<HealthRecord | null>(`/health-records/records/${studentId}`, [studentId]);
  const [form, setForm] = useState({
    bloodGroup: "",
    genotype: "",
    allergies: "",
    chronicConditions: "",
    medications: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    physicianName: "",
    physicianPhone: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading) {
      setForm({
        bloodGroup: record?.bloodGroup ?? "",
        genotype: record?.genotype ?? "",
        allergies: record?.allergies ?? "",
        chronicConditions: record?.chronicConditions ?? "",
        medications: record?.medications ?? "",
        emergencyContactName: record?.emergencyContactName ?? "",
        emergencyContactPhone: record?.emergencyContactPhone ?? "",
        emergencyContactRelation: record?.emergencyContactRelation ?? "",
        physicianName: record?.physicianName ?? "",
        physicianPhone: record?.physicianPhone ?? "",
        notes: record?.notes ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, record]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setSaved(false);
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || undefined]));
      await api.put(`/health-records/records/${studentId}`, payload);
      setSaved(true);
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}
      {saved && <p className="text-sm text-green-700">Saved.</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Blood group</Label>
          <Input value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} placeholder="e.g. O+" />
        </div>
        <div>
          <Label>Genotype</Label>
          <Input value={form.genotype} onChange={(e) => setForm({ ...form, genotype: e.target.value })} placeholder="e.g. AA" />
        </div>
      </div>
      <div>
        <Label>Allergies</Label>
        <textarea
          rows={2}
          value={form.allergies}
          onChange={(e) => setForm({ ...form, allergies: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <Label>Chronic conditions</Label>
        <textarea
          rows={2}
          value={form.chronicConditions}
          onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <Label>Medications</Label>
        <textarea
          rows={2}
          value={form.medications}
          onChange={(e) => setForm({ ...form, medications: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Emergency contact name</Label>
          <Input
            value={form.emergencyContactName}
            onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
          />
        </div>
        <div>
          <Label>Emergency contact phone</Label>
          <Input
            value={form.emergencyContactPhone}
            onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
          />
        </div>
        <div>
          <Label>Relationship</Label>
          <Input
            value={form.emergencyContactRelation}
            onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Physician name</Label>
          <Input value={form.physicianName} onChange={(e) => setForm({ ...form, physicianName: e.target.value })} />
        </div>
        <div>
          <Label>Physician phone</Label>
          <Input value={form.physicianPhone} onChange={(e) => setForm({ ...form, physicianPhone: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}

function IncidentFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [form, setForm] = useState({
    incidentDate: new Date().toISOString().slice(0, 10),
    description: "",
    actionTaken: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!student) {
      setError("Search for and select a student first");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/health-records", {
        studentId: student.id,
        incidentDate: form.incidentDate,
        description: form.description,
        actionTaken: form.actionTaken || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Log a clinic visit" onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Student</Label>
          {student ? (
            <p className="mt-1 text-sm text-brand-700">
              Selected: {student.user.firstName} {student.user.lastName}
            </p>
          ) : (
            <StudentSearch onSelect={setStudent} />
          )}
        </div>
        <div>
          <Label>Visit date</Label>
          <Input
            type="date"
            required
            value={form.incidentDate}
            onChange={(e) => setForm({ ...form, incidentDate: e.target.value })}
          />
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
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </Modal>
  );
}

/** Read-only combined view, reused by the student's own page and the parent
 * portal's per-child Health tab. */
export function StudentHealthView({ studentId }: { studentId: string }) {
  const { data, loading } = useFetch<{ record: HealthRecord | null; incidents: HealthIncident[] }>(
    `/health-records/students/${studentId}`,
    [studentId]
  );

  if (loading) return <Spinner />;
  if (!data) return <EmptyState message="No health record on file." />;

  const { record, incidents } = data;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-3 font-medium text-slate-800">Medical profile</h3>
        {!record ? (
          <p className="text-sm text-slate-500">No medical profile on file yet.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {record.bloodGroup && (
              <div>
                <dt className="text-slate-500">Blood group</dt>
                <dd className="font-medium text-slate-800">{record.bloodGroup}</dd>
              </div>
            )}
            {record.genotype && (
              <div>
                <dt className="text-slate-500">Genotype</dt>
                <dd className="font-medium text-slate-800">{record.genotype}</dd>
              </div>
            )}
            {record.allergies && (
              <div className="col-span-full">
                <dt className="text-slate-500">Allergies</dt>
                <dd className="text-slate-700">{record.allergies}</dd>
              </div>
            )}
            {record.chronicConditions && (
              <div className="col-span-full">
                <dt className="text-slate-500">Chronic conditions</dt>
                <dd className="text-slate-700">{record.chronicConditions}</dd>
              </div>
            )}
            {record.medications && (
              <div className="col-span-full">
                <dt className="text-slate-500">Medications</dt>
                <dd className="text-slate-700">{record.medications}</dd>
              </div>
            )}
            {record.emergencyContactName && (
              <div>
                <dt className="text-slate-500">Emergency contact</dt>
                <dd className="font-medium text-slate-800">
                  {record.emergencyContactName}
                  {record.emergencyContactRelation && ` (${record.emergencyContactRelation})`}
                </dd>
              </div>
            )}
            {record.emergencyContactPhone && (
              <div>
                <dt className="text-slate-500">Emergency phone</dt>
                <dd className="font-medium text-slate-800">{record.emergencyContactPhone}</dd>
              </div>
            )}
            {record.physicianName && (
              <div>
                <dt className="text-slate-500">Physician</dt>
                <dd className="font-medium text-slate-800">
                  {record.physicianName}
                  {record.physicianPhone && ` · ${record.physicianPhone}`}
                </dd>
              </div>
            )}
          </dl>
        )}
      </Card>

      <div>
        <h3 className="mb-3 font-medium text-slate-800">Clinic visit history</h3>
        {!incidents.length ? (
          <EmptyState message="No clinic visits recorded." />
        ) : (
          <div className="space-y-2">
            {incidents.map((i) => (
              <Card key={i.id}>
                <p className="text-sm text-slate-500">{new Date(i.incidentDate).toLocaleDateString()}</p>
                <p className="mt-1 text-sm text-slate-600">{i.description}</p>
                {i.actionTaken && (
                  <p className="mt-1 text-sm text-slate-500">
                    <span className="font-medium">Action taken:</span> {i.actionTaken}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
