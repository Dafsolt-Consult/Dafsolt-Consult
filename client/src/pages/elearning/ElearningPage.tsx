import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { useClassArms, useSubjects } from "../../hooks/useAcademics";
import { CourseMaterial, MaterialType, OnlineClassSession } from "../../types";

const SUB_TABS = ["Course Materials", "Live Classes"] as const;

export function ElearningPage() {
  const { user } = useAuth();
  if (user?.role === "STUDENT") return <StudentElearningView />;
  return <StaffElearningView />;
}

function StaffElearningView() {
  const [tab, setTab] = useState<(typeof SUB_TABS)[number]>("Course Materials");

  return (
    <div>
      <PageHeader title="E-Learning" subtitle="Course materials and live online classes for your students" />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200">
        {SUB_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Course Materials" ? <StaffMaterialsTab /> : <StaffSessionsTab />}
    </div>
  );
}

function StaffMaterialsTab() {
  const { data: classArms } = useClassArms();
  const [classArmId, setClassArmId] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const query = classArmId ? `?classArmId=${classArmId}` : "";
  const { data: materials, loading, error, refetch } = useFetch<CourseMaterial[]>(`/elearning/materials${query}`, [classArmId]);

  async function remove(id: string) {
    if (!confirm("Delete this course material?")) return;
    await api.delete(`/elearning/materials/${id}`);
    refetch();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="max-w-xs flex-1">
          <Select value={classArmId} onChange={(e) => setClassArmId(e.target.value)}>
            <option value="">All classes</option>
            {classArms?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.classLevel?.name} {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Add material</Button>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !materials?.length ? (
        <EmptyState message="No course materials posted yet." />
      ) : (
        <div className="space-y-2">
          {materials.map((m) => (
            <Card key={m.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{m.title}</p>
                <p className="text-sm text-slate-500">
                  {m.subject?.name} · {m.classArm?.classLevel.name} {m.classArm?.name} · <Badge>{m.type}</Badge>
                </p>
                {m.description && <p className="mt-1 text-sm text-slate-600">{m.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <a href={m.url} target="_blank" rel="noreferrer" className="text-sm text-brand-700 hover:underline">
                  Open
                </a>
                <Button variant="secondary" onClick={() => remove(m.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <CreateMaterialModal onClose={() => setShowCreate(false)} onCreated={refetch} />}
    </div>
  );
}

function CreateMaterialModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: classArms } = useClassArms();
  const { data: subjects } = useSubjects();
  const [form, setForm] = useState({
    classArmId: "",
    subjectId: "",
    title: "",
    description: "",
    type: "DOCUMENT" as MaterialType,
    url: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/elearning/materials", form);
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New course material" onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Class</Label>
            <Select required value={form.classArmId} onChange={(e) => setForm({ ...form, classArmId: e.target.value })}>
              <option value="">Select</option>
              {classArms?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.classLevel?.name} {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">Select</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Type</Label>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MaterialType })}>
            <option value="DOCUMENT">Document</option>
            <option value="VIDEO">Video</option>
            <option value="LINK">Link</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div>
          <Label>URL</Label>
          <Input type="url" required placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        </div>
        <div>
          <Label>Description</Label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Posting..." : "Add material"}
        </Button>
      </form>
    </Modal>
  );
}

function StaffSessionsTab() {
  const { data: classArms } = useClassArms();
  const [classArmId, setClassArmId] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const query = classArmId ? `?classArmId=${classArmId}` : "";
  const { data: sessions, loading, error, refetch } = useFetch<OnlineClassSession[]>(`/elearning/sessions${query}`, [classArmId]);

  async function remove(id: string) {
    if (!confirm("Cancel this online class session?")) return;
    await api.delete(`/elearning/sessions/${id}`);
    refetch();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="max-w-xs flex-1">
          <Select value={classArmId} onChange={(e) => setClassArmId(e.target.value)}>
            <option value="">All classes</option>
            {classArms?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.classLevel?.name} {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Schedule class</Button>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !sessions?.length ? (
        <EmptyState message="No online classes scheduled yet." />
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <Card key={s.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{s.title}</p>
                <p className="text-sm text-slate-500">
                  {s.subject?.name} · {s.classArm?.classLevel.name} {s.classArm?.name} · {new Date(s.startsAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a href={s.meetingUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-700 hover:underline">
                  Join link
                </a>
                <Button variant="secondary" onClick={() => remove(s.id)}>
                  Cancel
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <CreateSessionModal onClose={() => setShowCreate(false)} onCreated={refetch} />}
    </div>
  );
}

function CreateSessionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: classArms } = useClassArms();
  const { data: subjects } = useSubjects();
  const [form, setForm] = useState({ classArmId: "", subjectId: "", title: "", meetingUrl: "", startsAt: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/elearning/sessions", form);
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Schedule an online class" onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Class</Label>
            <Select required value={form.classArmId} onChange={(e) => setForm({ ...form, classArmId: e.target.value })}>
              <option value="">Select</option>
              {classArms?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.classLevel?.name} {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">Select</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Meeting link</Label>
          <Input
            type="url"
            required
            placeholder="https://meet.google.com/..."
            value={form.meetingUrl}
            onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })}
          />
        </div>
        <div>
          <Label>Starts at</Label>
          <Input type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Scheduling..." : "Schedule class"}
        </Button>
      </form>
    </Modal>
  );
}

function StudentElearningView() {
  const [tab, setTab] = useState<(typeof SUB_TABS)[number]>("Course Materials");
  const { data: materials, loading: loadingMaterials, error: materialsError } = useFetch<CourseMaterial[]>("/elearning/materials/students/me");
  const { data: sessions, loading: loadingSessions, error: sessionsError } = useFetch<OnlineClassSession[]>(
    "/elearning/sessions/students/me"
  );

  return (
    <div>
      <PageHeader title="E-Learning" subtitle="Course materials and live classes for your class" />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200">
        {SUB_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Course Materials" ? (
        <>
          {materialsError && <ErrorBanner message={materialsError} />}
          {loadingMaterials ? (
            <Spinner />
          ) : !materials?.length ? (
            <EmptyState message="No course materials posted yet." />
          ) : (
            <div className="space-y-2">
              {materials.map((m) => (
                <Card key={m.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{m.title}</p>
                      <p className="text-sm text-slate-500">
                        {m.subject?.name} · <Badge>{m.type}</Badge>
                      </p>
                      {m.description && <p className="mt-1 text-sm text-slate-600">{m.description}</p>}
                    </div>
                    <a href={m.url} target="_blank" rel="noreferrer" className="text-sm text-brand-700 hover:underline">
                      Open
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {sessionsError && <ErrorBanner message={sessionsError} />}
          {loadingSessions ? (
            <Spinner />
          ) : !sessions?.length ? (
            <EmptyState message="No online classes scheduled yet." />
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const upcoming = new Date(s.startsAt).getTime() > Date.now();
                return (
                  <Card key={s.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{s.title}</p>
                        <p className="text-sm text-slate-500">
                          {s.subject?.name} · {new Date(s.startsAt).toLocaleString()}
                        </p>
                      </div>
                      {upcoming ? (
                        <Button onClick={() => window.open(s.meetingUrl, "_blank", "noopener,noreferrer")}>Join</Button>
                      ) : (
                        <Badge>Ended</Badge>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Read-only e-learning view for the parent dashboard, scoped to one child. */
export function ParentChildElearning({ studentId }: { studentId: string }) {
  const { data: materials, loading: loadingMaterials } = useFetch<CourseMaterial[]>(
    `/elearning/materials/students/${studentId}`,
    [studentId]
  );
  const { data: sessions, loading: loadingSessions } = useFetch<OnlineClassSession[]>(
    `/elearning/sessions/students/${studentId}`,
    [studentId]
  );

  if (loadingMaterials || loadingSessions) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 font-medium text-slate-800">Course materials</h3>
        {!materials?.length ? (
          <EmptyState message="No course materials posted yet." />
        ) : (
          <div className="space-y-2">
            {materials.map((m) => (
              <Card key={m.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{m.title}</p>
                  <p className="text-sm text-slate-500">
                    {m.subject?.name} · <Badge>{m.type}</Badge>
                  </p>
                </div>
                <a href={m.url} target="_blank" rel="noreferrer" className="text-sm text-brand-700 hover:underline">
                  Open
                </a>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-medium text-slate-800">Live classes</h3>
        {!sessions?.length ? (
          <EmptyState message="No online classes scheduled yet." />
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <Card key={s.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{s.title}</p>
                  <p className="text-sm text-slate-500">
                    {s.subject?.name} · {new Date(s.startsAt).toLocaleString()}
                  </p>
                </div>
                <Badge>{new Date(s.startsAt).getTime() > Date.now() ? "Upcoming" : "Ended"}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
