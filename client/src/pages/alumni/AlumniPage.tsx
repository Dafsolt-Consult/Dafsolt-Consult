import { FormEvent, useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { useClassLevels } from "../../hooks/useAcademics";
import { Alumnus, Paginated, Student } from "../../types";

export function AlumniPage() {
  const { data: classLevels } = useClassLevels();
  const [graduationYear, setGraduationYear] = useState("");
  const [lastClassLevelId, setLastClassLevelId] = useState("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [editing, setEditing] = useState<Alumnus | null>(null);

  const query = new URLSearchParams();
  if (graduationYear) query.set("graduationYear", graduationYear);
  if (lastClassLevelId) query.set("lastClassLevelId", lastClassLevelId);
  if (search) query.set("search", search);

  const { data: alumni, loading, error, refetch } = useFetch<Alumnus[]>(
    `/alumni?${query.toString()}`,
    [graduationYear, lastClassLevelId, search]
  );

  async function remove(id: string) {
    if (!confirm("Remove this alumnus record?")) return;
    await api.delete(`/alumni/${id}`);
    refetch();
  }

  return (
    <div>
      <PageHeader
        title="Alumni"
        subtitle="Directory of former students"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowPromote(true)}>
              Promote a student
            </Button>
            <Button onClick={() => setShowAdd(true)}>+ Add alumnus</Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Input
          className="max-w-[140px]"
          type="number"
          placeholder="Grad. year"
          value={graduationYear}
          onChange={(e) => setGraduationYear(e.target.value)}
        />
        <Select className="max-w-xs" value={lastClassLevelId} onChange={(e) => setLastClassLevelId(e.target.value)}>
          <option value="">All classes</option>
          {classLevels?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !alumni?.length ? (
        <EmptyState message="No alumni recorded yet." />
      ) : (
        <div className="space-y-2">
          {alumni.map((a) => (
            <Card key={a.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">
                  {a.firstName} {a.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  <Badge>Class of {a.graduationYear}</Badge>
                  {a.lastClassLevel && <span> · {a.lastClassLevel.name}</span>}
                  {a.occupation && <span> · {a.occupation}{a.employer ? ` at ${a.employer}` : ""}</span>}
                </p>
                {(a.email || a.phone) && (
                  <p className="mt-1 text-sm text-slate-500">{[a.email, a.phone].filter(Boolean).join(" · ")}</p>
                )}
                {a.higherInstitution && <p className="mt-1 text-sm text-slate-600">Studying at {a.higherInstitution}</p>}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={() => setEditing(a)}>
                  Edit
                </Button>
                <Button variant="danger" onClick={() => remove(a.id)}>
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showAdd && <AlumnusFormModal title="Add alumnus" onClose={() => setShowAdd(false)} onSaved={refetch} />}
      {editing && (
        <AlumnusFormModal title="Edit alumnus" alumnus={editing} onClose={() => setEditing(null)} onSaved={refetch} />
      )}
      {showPromote && <PromoteStudentModal onClose={() => setShowPromote(false)} onSaved={refetch} />}
    </div>
  );
}

interface AlumnusForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  graduationYear: string;
  lastClassLevelId: string;
  higherInstitution: string;
  occupation: string;
  employer: string;
  bio: string;
}

function emptyForm(a?: Alumnus): AlumnusForm {
  return {
    firstName: a?.firstName ?? "",
    lastName: a?.lastName ?? "",
    email: a?.email ?? "",
    phone: a?.phone ?? "",
    graduationYear: a ? String(a.graduationYear) : String(new Date().getFullYear()),
    lastClassLevelId: a?.lastClassLevelId ?? "",
    higherInstitution: a?.higherInstitution ?? "",
    occupation: a?.occupation ?? "",
    employer: a?.employer ?? "",
    bio: a?.bio ?? "",
  };
}

function AlumnusFormModal({
  title,
  alumnus,
  onClose,
  onSaved,
}: {
  title: string;
  alumnus?: Alumnus;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: classLevels } = useClassLevels();
  const [form, setForm] = useState<AlumnusForm>(emptyForm(alumnus));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        graduationYear: Number(form.graduationYear),
        lastClassLevelId: form.lastClassLevelId || undefined,
        higherInstitution: form.higherInstitution || undefined,
        occupation: form.occupation || undefined,
        employer: form.employer || undefined,
        bio: form.bio || undefined,
      };
      if (alumnus) {
        await api.patch(`/alumni/${alumnus.id}`, payload);
      } else {
        await api.post("/alumni", payload);
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
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Graduation year</Label>
            <Input
              type="number"
              required
              value={form.graduationYear}
              onChange={(e) => setForm({ ...form, graduationYear: e.target.value })}
            />
          </div>
          <div>
            <Label>Last class</Label>
            <Select value={form.lastClassLevelId} onChange={(e) => setForm({ ...form, lastClassLevelId: e.target.value })}>
              <option value="">Unknown</option>
              {classLevels?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Currently studying at</Label>
          <Input
            placeholder="e.g. University of Lagos"
            value={form.higherInstitution}
            onChange={(e) => setForm({ ...form, higherInstitution: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Occupation</Label>
            <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
          </div>
          <div>
            <Label>Employer</Label>
            <Input value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
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

function PromoteStudentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [studentSearch, setStudentSearch] = useState("");
  const { data: students } = useFetch<Paginated<Student>>(
    studentSearch ? `/students?search=${encodeURIComponent(studentSearch)}` : null,
    [studentSearch]
  );
  const [studentId, setStudentId] = useState("");
  const { data: classLevels } = useClassLevels();
  const [form, setForm] = useState({
    graduationYear: String(new Date().getFullYear()),
    lastClassLevelId: "",
    higherInstitution: "",
    occupation: "",
    employer: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!studentId) {
      setError("Search for and select a student first");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/alumni/from-student/${studentId}`, {
        graduationYear: Number(form.graduationYear),
        lastClassLevelId: form.lastClassLevelId || undefined,
        higherInstitution: form.higherInstitution || undefined,
        occupation: form.occupation || undefined,
        employer: form.employer || undefined,
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
    <Modal title="Promote a student to alumnus" onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Find student</Label>
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Graduation year</Label>
            <Input
              type="number"
              required
              value={form.graduationYear}
              onChange={(e) => setForm({ ...form, graduationYear: e.target.value })}
            />
          </div>
          <div>
            <Label>Last class</Label>
            <Select value={form.lastClassLevelId} onChange={(e) => setForm({ ...form, lastClassLevelId: e.target.value })}>
              <option value="">Unknown</option>
              {classLevels?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Currently studying at</Label>
          <Input
            placeholder="e.g. University of Lagos"
            value={form.higherInstitution}
            onChange={(e) => setForm({ ...form, higherInstitution: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Occupation</Label>
            <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
          </div>
          <div>
            <Label>Employer</Label>
            <Input value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} />
          </div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : "Promote to alumnus"}
        </Button>
      </form>
    </Modal>
  );
}
