import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Button, Card, EmptyState, ErrorBanner, Label, Modal, PageHeader, Select, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { pickCurrentSession, useClassArms, useSessions, useSubjects } from "../../hooks/useAcademics";
import { TimetablePeriod } from "../../types";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

export function TimetablePage() {
  const { user } = useAuth();
  if (user?.role === "SCHOOL_ADMIN") return <AdminTimetableView />;
  if (user?.role === "TEACHER") return <TeacherTimetableView />;
  return <StudentTimetableView />;
}

function WeeklyGrid({
  periods,
  renderDetail,
  onEdit,
  onDelete,
}: {
  periods: TimetablePeriod[];
  renderDetail: (p: TimetablePeriod) => string;
  onEdit?: (p: TimetablePeriod) => void;
  onDelete?: (p: TimetablePeriod) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {DAYS.map((day) => {
        const dayPeriods = periods.filter((p) => p.dayOfWeek === day.value).sort((a, b) => a.startTime.localeCompare(b.startTime));
        return (
          <div key={day.value}>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">{day.label}</h3>
            <div className="space-y-2">
              {dayPeriods.map((p) => (
                <Card key={p.id} className="p-3">
                  <p className="text-xs font-medium text-slate-400">
                    {p.startTime}–{p.endTime}
                  </p>
                  <p className="text-sm font-medium text-slate-800">{p.subject?.name}</p>
                  <p className="text-xs text-slate-500">{renderDetail(p)}</p>
                  {(onEdit || onDelete) && (
                    <div className="mt-2 flex gap-2">
                      {onEdit && (
                        <button onClick={() => onEdit(p)} className="text-xs font-medium text-brand-700 hover:underline">
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(p)} className="text-xs font-medium text-red-600 hover:underline">
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
              {!dayPeriods.length && <p className="text-xs text-slate-400">No periods</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function useCurrentTerm() {
  const { data: sessions } = useSessions();
  const currentSession = pickCurrentSession(sessions);
  const currentTerm = currentSession?.terms?.find((t) => t.isCurrent) ?? currentSession?.terms?.[0];
  return { sessions, currentSession, currentTerm };
}

function AdminTimetableView() {
  const { data: classArms } = useClassArms();
  const { currentSession, currentTerm } = useCurrentTerm();
  const [classArmId, setClassArmId] = useState("");
  const [termId, setTermId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<TimetablePeriod | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTermId = termId || currentTerm?.id || "";

  const query = classArmId && activeTermId ? `?classArmId=${classArmId}&termId=${activeTermId}` : "";
  const { data: periods, loading, refetch } = useFetch<TimetablePeriod[]>(`/timetable${query}`, [classArmId, activeTermId]);

  async function remove(period: TimetablePeriod) {
    setError(null);
    try {
      await api.delete(`/timetable/${period.id}`);
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Timetable"
        subtitle="Weekly period schedule per class"
        actions={
          classArmId && activeTermId ? <Button onClick={() => setShowCreate(true)}>+ Add period</Button> : undefined
        }
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Class</Label>
            <Select value={classArmId} onChange={(e) => setClassArmId(e.target.value)}>
              <option value="">Select class</option>
              {classArms?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.classLevel?.name} {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Term</Label>
            <Select value={activeTermId} onChange={(e) => setTermId(e.target.value)}>
              {currentSession?.terms?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {!classArmId || !activeTermId ? (
        <p className="text-sm text-slate-500">Choose a class and term to view/edit its timetable.</p>
      ) : loading ? (
        <Spinner />
      ) : (
        <WeeklyGrid
          periods={periods ?? []}
          renderDetail={(p) => (p.teacher ? `${p.teacher.user.firstName} ${p.teacher.user.lastName}` : "No teacher assigned")}
          onEdit={setEditing}
          onDelete={remove}
        />
      )}

      {showCreate && classArmId && activeTermId && (
        <PeriodFormModal classArmId={classArmId} termId={activeTermId} onClose={() => setShowCreate(false)} onSaved={refetch} />
      )}
      {editing && (
        <PeriodFormModal
          classArmId={classArmId}
          termId={activeTermId}
          period={editing}
          onClose={() => setEditing(null)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}

function PeriodFormModal({
  classArmId,
  termId,
  period,
  onClose,
  onSaved,
}: {
  classArmId: string;
  termId: string;
  period?: TimetablePeriod;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: subjects } = useSubjects();
  const [form, setForm] = useState({
    subjectId: period?.subjectId ?? "",
    teacherId: period?.teacherId ?? "",
    dayOfWeek: String(period?.dayOfWeek ?? 1),
    startTime: period?.startTime ?? "08:00",
    endTime: period?.endTime ?? "08:40",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        classArmId,
        termId,
        subjectId: form.subjectId,
        teacherId: form.teacherId || undefined,
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
      };
      if (period) {
        await api.patch(`/timetable/${period.id}`, payload);
      } else {
        await api.post("/timetable", payload);
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
    <Modal title={period ? "Edit period" : "Add period"} onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
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
        <div>
          <Label>Day</Label>
          <Select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start time</Label>
            <input
              type="time"
              required
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <Label>End time</Label>
            <input
              type="time"
              required
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : period ? "Save changes" : "Add period"}
        </Button>
      </form>
    </Modal>
  );
}

function TeacherTimetableView() {
  const { currentSession, currentTerm } = useCurrentTerm();
  const { data: periods, loading, error } = useFetch<TimetablePeriod[]>(
    currentTerm ? `/timetable/teachers/me?termId=${currentTerm.id}` : null,
    [currentTerm?.id]
  );

  return (
    <div>
      <PageHeader title="My Timetable" subtitle={currentSession ? `${currentSession.name}` : undefined} />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !periods?.length ? (
        <EmptyState message="No timetable periods assigned to you yet." />
      ) : (
        <WeeklyGrid
          periods={periods}
          renderDetail={(p) => `${p.classArm?.classLevel.name} ${p.classArm?.name}`}
        />
      )}
    </div>
  );
}

function StudentTimetableView() {
  const { currentSession, currentTerm } = useCurrentTerm();
  const { data: periods, loading, error } = useFetch<TimetablePeriod[]>(
    currentTerm ? `/timetable/students/me?termId=${currentTerm.id}` : null,
    [currentTerm?.id]
  );

  return (
    <div>
      <PageHeader title="My Timetable" subtitle={currentSession ? `${currentSession.name}` : undefined} />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !periods?.length ? (
        <EmptyState message="No timetable published for your class yet." />
      ) : (
        <WeeklyGrid periods={periods} renderDetail={(p) => (p.teacher ? `${p.teacher.user.firstName} ${p.teacher.user.lastName}` : "")} />
      )}
    </div>
  );
}

export function ParentChildTimetable({ studentId }: { studentId: string }) {
  const { currentTerm } = useCurrentTerm();
  const { data: periods, loading } = useFetch<TimetablePeriod[]>(
    currentTerm ? `/timetable/students/${studentId}?termId=${currentTerm.id}` : null,
    [studentId, currentTerm?.id]
  );

  if (loading) return <Spinner />;
  if (!periods?.length) return <EmptyState message="No timetable published for this class yet." />;

  return (
    <WeeklyGrid periods={periods} renderDetail={(p) => (p.teacher ? `${p.teacher.user.firstName} ${p.teacher.user.lastName}` : "")} />
  );
}
