import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, ErrorBanner, Input, Label, PageHeader, Select, Spinner } from "../../components/ui";
import { currentSessionId, currentTermId, useClassArms, useClassLevels, useSessions, useSubjects } from "../../hooks/useAcademics";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { ClassArmSubject, Teacher } from "../../types";

const TABS = ["Sessions & Terms", "Class Levels", "Class Arms", "Subjects", "Teacher Assignments"] as const;

export function AcademicsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = (TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as (typeof TABS)[number]) : "Sessions & Terms";
  const { user } = useAuth();
  const isAdmin = user?.role === "SCHOOL_ADMIN";

  return (
    <div>
      <PageHeader title="Classes & Subjects" subtitle="Manage your school's academic structure" />
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setSearchParams({ tab: t })}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Sessions & Terms" && <SessionsTab canEdit={isAdmin} />}
      {tab === "Class Levels" && <ClassLevelsTab canEdit={isAdmin} />}
      {tab === "Class Arms" && <ClassArmsTab canEdit={isAdmin} />}
      {tab === "Subjects" && <SubjectsTab canEdit={isAdmin} />}
      {tab === "Teacher Assignments" && <TeacherAssignmentsTab canEdit={isAdmin} />}
    </div>
  );
}

function SessionsTab({ canEdit }: { canEdit: boolean }) {
  const { data: sessions, refetch } = useSessions();
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });
  const [error, setError] = useState<string | null>(null);

  async function createSession(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/academics/sessions", { ...form, isCurrent: true });
      setForm({ name: "", startDate: "", endDate: "" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-3">
        {sessions?.map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">
                {s.name} {s.isCurrent && <Badge tone="success">Current</Badge>}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {s.terms?.map((t) => (
                <Badge key={t.id} tone={t.isCurrent ? "success" : "default"}>
                  {t.name}
                </Badge>
              ))}
              {!s.terms?.length && <span className="text-xs text-slate-400">No terms yet</span>}
            </div>
          </Card>
        ))}
        {!sessions?.length && <p className="text-sm text-slate-500">No academic sessions yet.</p>}
      </div>
      {canEdit && (
        <Card>
          <h3 className="mb-3 font-medium text-slate-800">New session</h3>
          {error && (
            <div className="mb-3">
              <ErrorBanner message={error} />
            </div>
          )}
          <form onSubmit={createSession} className="space-y-3">
            <div>
              <Label>Name (e.g. 2025/2026)</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Start date</Label>
              <Input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">
              Create session
            </Button>
          </form>
          {!!sessions?.length && <TermForm sessionId={sessions.find((s) => s.isCurrent)?.id ?? sessions[0].id} onCreated={refetch} />}
        </Card>
      )}
    </div>
  );
}

function TermForm({ sessionId, onCreated }: { sessionId: string; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });
  const [error, setError] = useState<string | null>(null);

  async function createTerm(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/academics/terms", { ...form, sessionId, isCurrent: true });
      setForm({ name: "", startDate: "", endDate: "" });
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      <h3 className="mb-3 font-medium text-slate-800">New term (current session)</h3>
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={createTerm} className="space-y-3">
        <div>
          <Label>Term name</Label>
          <Select required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}>
            <option value="">Select</option>
            <option>First Term</option>
            <option>Second Term</option>
            <option>Third Term</option>
          </Select>
        </div>
        <div>
          <Label>Start date</Label>
          <Input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </div>
        <div>
          <Label>End date</Label>
          <Input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </div>
        <Button type="submit" className="w-full">
          Create term
        </Button>
      </form>
    </div>
  );
}

function ClassLevelsTab({ canEdit }: { canEdit: boolean }) {
  const { data: levels, refetch } = useClassLevels();
  const [form, setForm] = useState({ name: "", stage: "PRIMARY", order: "1" });
  const [error, setError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/academics/class-levels", { ...form, order: Number(form.order) });
      setForm({ name: "", stage: "PRIMARY", order: "1" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-2">
        {levels?.map((l) => (
          <Card key={l.id} className="flex items-center justify-between">
            <span className="font-medium text-slate-800">{l.name}</span>
            <Badge>{l.stage.replace("_", " ")}</Badge>
          </Card>
        ))}
        {!levels?.length && <p className="text-sm text-slate-500">No class levels yet, e.g. "Primary 1", "JSS 1", "SSS 3".</p>}
      </div>
      {canEdit && (
        <Card>
          <h3 className="mb-3 font-medium text-slate-800">New class level</h3>
          {error && (
            <div className="mb-3">
              <ErrorBanner message={error} />
            </div>
          )}
          <form onSubmit={create} className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input required placeholder="e.g. Primary 1, JSS 1, SSS 3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Stage</Label>
              <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                <option value="PRIMARY">Primary</option>
                <option value="JUNIOR_SECONDARY">Junior Secondary</option>
                <option value="SENIOR_SECONDARY">Senior Secondary</option>
              </Select>
            </div>
            <div>
              <Label>Sort order</Label>
              <Input type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">
              Create class level
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

function ClassArmsTab({ canEdit }: { canEdit: boolean }) {
  const { data: arms, refetch } = useClassArms();
  const { data: levels } = useClassLevels();
  const { data: teachers } = useFetch<Teacher[]>(canEdit ? "/teachers" : null);
  const [form, setForm] = useState({ classLevelId: "", name: "", capacity: "40" });
  const [error, setError] = useState<string | null>(null);
  const [savingArmId, setSavingArmId] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/academics/class-arms", { ...form, capacity: Number(form.capacity) });
      setForm({ classLevelId: "", name: "", capacity: "40" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function setFormTeacher(armId: string, teacherId: string) {
    setError(null);
    setSavingArmId(armId);
    try {
      await api.patch(`/academics/class-arms/${armId}`, { formTeacherId: teacherId || null });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSavingArmId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-2">
        {error && (
          <div className="mb-2">
            <ErrorBanner message={error} />
          </div>
        )}
        {arms?.map((a) => (
          <Card key={a.id} className="flex items-center justify-between gap-4">
            <div>
              <span className="font-medium text-slate-800">
                {a.classLevel?.name} {a.name}
              </span>
              <span className="ml-2 text-xs text-slate-500">Capacity {a.capacity}</span>
            </div>
            {canEdit ? (
              <Select
                className="max-w-xs"
                value={a.formTeacherId ?? ""}
                disabled={savingArmId === a.id}
                onChange={(e) => setFormTeacher(a.id, e.target.value)}
              >
                <option value="">No form teacher</option>
                {teachers?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user.firstName} {t.user.lastName}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="text-sm text-slate-500">
                {a.formTeacher ? `${a.formTeacher.user.firstName} ${a.formTeacher.user.lastName}` : "No form teacher"}
              </span>
            )}
          </Card>
        ))}
        {!arms?.length && <p className="text-sm text-slate-500">No class arms yet, e.g. "JSS 1 A".</p>}
      </div>
      {canEdit && (
        <Card>
          <h3 className="mb-3 font-medium text-slate-800">New class arm</h3>
          {error && (
            <div className="mb-3">
              <ErrorBanner message={error} />
            </div>
          )}
          <form onSubmit={create} className="space-y-3">
            <div>
              <Label>Class level</Label>
              <Select required value={form.classLevelId} onChange={(e) => setForm({ ...form, classLevelId: e.target.value })}>
                <option value="">Select</option>
                {levels?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Arm name</Label>
              <Input required placeholder="e.g. A, Gold" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">
              Create class arm
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

function SubjectsTab({ canEdit }: { canEdit: boolean }) {
  const { data: subjects, refetch } = useSubjects();
  const [form, setForm] = useState({ name: "", code: "", isCore: true });
  const [error, setError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/academics/subjects", form);
      setForm({ name: "", code: "", isCore: true });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-2">
        {subjects?.map((s) => (
          <Card key={s.id} className="flex items-center justify-between">
            <span className="font-medium text-slate-800">
              {s.name} <span className="text-xs text-slate-400">({s.code})</span>
            </span>
            <Badge tone={s.isCore ? "success" : "default"}>{s.isCore ? "Core" : "Elective"}</Badge>
          </Card>
        ))}
        {!subjects?.length && <p className="text-sm text-slate-500">No subjects yet.</p>}
      </div>
      {canEdit && (
        <Card>
          <h3 className="mb-3 font-medium text-slate-800">New subject</h3>
          {error && (
            <div className="mb-3">
              <ErrorBanner message={error} />
            </div>
          )}
          <form onSubmit={create} className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input required placeholder="e.g. Mathematics" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Code</Label>
              <Input required placeholder="e.g. MTH" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.isCore} onChange={(e) => setForm({ ...form, isCore: e.target.checked })} />
              Core subject
            </label>
            <Button type="submit" className="w-full">
              Create subject
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

function TeacherAssignmentsTab({ canEdit }: { canEdit: boolean }) {
  const { data: sessions } = useSessions();
  const { data: classArms } = useClassArms();
  const { data: subjects } = useSubjects();
  const { data: teachers } = useFetch<Teacher[]>(canEdit ? "/teachers" : null);

  const [sessionId, setSessionId] = useState("");
  const [termId, setTermId] = useState("");
  const [classArmId, setClassArmId] = useState("");
  const [savingSubjectId, setSavingSubjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSessionId = sessionId || currentSessionId(sessions);
  const activeSession = sessions?.find((s) => s.id === activeSessionId);
  const activeTermId = termId || currentTermId(sessions);
  const activeClassArmId = classArmId || classArms?.[0]?.id || "";

  const query = activeClassArmId && activeTermId ? `?classArmId=${activeClassArmId}&termId=${activeTermId}` : "";
  const {
    data: assignments,
    loading,
    refetch,
  } = useFetch<ClassArmSubject[]>(activeClassArmId && activeTermId ? `/academics/class-subjects${query}` : null, [
    activeClassArmId,
    activeTermId,
  ]);

  const assignmentBySubject = new Map((assignments ?? []).map((a) => [a.subjectId, a]));

  async function assignTeacher(subjectId: string, teacherId: string) {
    setError(null);
    setSavingSubjectId(subjectId);
    try {
      await api.post("/academics/class-subjects", {
        classArmId: activeClassArmId,
        subjectId,
        teacherId: teacherId || null,
        sessionId: activeSessionId,
        termId: activeTermId,
      });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSavingSubjectId(null);
    }
  }

  if (!canEdit) {
    return <p className="text-sm text-slate-500">Only a school admin can assign teachers to subjects.</p>;
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        Pick a class and term, then assign the teacher responsible for each subject in that class. Change the
        selection any time to reassign a subject to a different teacher, or pick "Unassigned" to remove one.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label>Class</Label>
          <Select value={activeClassArmId} onChange={(e) => setClassArmId(e.target.value)}>
            {classArms?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.classLevel?.name} {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Session</Label>
          <Select
            value={activeSessionId}
            onChange={(e) => {
              setSessionId(e.target.value);
              setTermId("");
            }}
          >
            {sessions?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Term</Label>
          <Select value={activeTermId} onChange={(e) => setTermId(e.target.value)}>
            {activeSession?.terms?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {!activeClassArmId || !activeTermId ? (
        <p className="text-sm text-slate-500">Create a class, session and term first.</p>
      ) : loading ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {subjects?.map((s) => {
            const assignment = assignmentBySubject.get(s.id);
            return (
              <Card key={s.id} className="flex items-center justify-between">
                <span className="font-medium text-slate-800">{s.name}</span>
                <div className="flex items-center gap-2">
                  <Select
                    className="w-56"
                    value={assignment?.teacherId ?? ""}
                    disabled={savingSubjectId === s.id}
                    onChange={(e) => assignTeacher(s.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {teachers?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.user.firstName} {t.user.lastName}
                      </option>
                    ))}
                  </Select>
                  {assignment?.teacherId && <Badge tone="success">Assigned</Badge>}
                </div>
              </Card>
            );
          })}
          {!subjects?.length && <p className="text-sm text-slate-500">No subjects yet — add some in the Subjects tab first.</p>}
        </div>
      )}
    </div>
  );
}
