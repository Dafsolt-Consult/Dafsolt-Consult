import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Button, Card, EmptyState, ErrorBanner, Label, Modal, PageHeader, Select, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { useClassArms, useSessions, useSubjects } from "../../hooks/useAcademics";
import { DayOfWeek, TimetableSlot } from "../../types";

const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  teacher?: { id: string } | null;
}

export function TimetablePage() {
  const { user } = useAuth();
  if (user?.role === "STUDENT") return <StudentTimetableView />;
  return <StaffTimetableView />;
}

function useCurrentTerm() {
  const { data: sessions } = useSessions();
  const currentSession = sessions?.find((s) => s.isCurrent) ?? sessions?.[0];
  const currentTerm = currentSession?.terms?.find((t) => t.isCurrent) ?? currentSession?.terms?.[0];
  return { sessions, currentSession, currentTerm };
}

function Grid({
  slots,
  canManage,
  onEdit,
  onDelete,
}: {
  slots: TimetableSlot[];
  canManage: boolean;
  onEdit?: (slot: TimetableSlot) => void;
  onDelete?: (slot: TimetableSlot) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {DAYS.map((day) => {
        const daySlots = slots.filter((s) => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
        return (
          <div key={day}>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">{DAY_LABELS[day]}</p>
            <div className="space-y-2">
              {daySlots.length === 0 && <p className="text-xs text-slate-400">No lessons</p>}
              {daySlots.map((s) => (
                <Card key={s.id} className="p-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {s.startTime}–{s.endTime}
                  </p>
                  <p className="text-slate-600">{s.subject?.name}</p>
                  {s.teacher && (
                    <p className="text-xs text-slate-500">
                      {s.teacher.user.firstName} {s.teacher.user.lastName}
                    </p>
                  )}
                  {canManage && (
                    <div className="mt-2 flex gap-2">
                      <button className="text-xs text-brand-700 hover:underline" onClick={() => onEdit?.(s)}>
                        Edit
                      </button>
                      <button className="text-xs text-red-600 hover:underline" onClick={() => onDelete?.(s)}>
                        Delete
                      </button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StaffTimetableView() {
  const { user } = useAuth();
  const { currentTerm } = useCurrentTerm();
  const { data: classArms } = useClassArms();
  const [classArmId, setClassArmId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<TimetableSlot | null>(null);

  const query = classArmId && currentTerm ? `?classArmId=${classArmId}&termId=${currentTerm.id}` : null;
  const { data: slots, loading, error, refetch } = useFetch<TimetableSlot[]>(query, [classArmId, currentTerm?.id]);

  async function remove(slot: TimetableSlot) {
    if (!confirm("Delete this timetable slot?")) return;
    await api.delete(`/timetable/${slot.id}`);
    refetch();
  }

  return (
    <div>
      <PageHeader
        title="Timetable"
        subtitle="Weekly class schedule"
        actions={
          user?.role === "SCHOOL_ADMIN" && classArmId && currentTerm ? (
            <Button onClick={() => setShowCreate(true)}>+ Add slot</Button>
          ) : undefined
        }
      />

      <div className="mb-4 max-w-xs">
        <Select value={classArmId} onChange={(e) => setClassArmId(e.target.value)}>
          <option value="">Select a class</option>
          {classArms?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.classLevel?.name} {c.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <ErrorBanner message={error} />}
      {!classArmId ? (
        <EmptyState message="Select a class to view its timetable." />
      ) : loading ? (
        <Spinner />
      ) : (
        <Grid
          slots={slots ?? []}
          canManage={user?.role === "SCHOOL_ADMIN"}
          onEdit={setEditing}
          onDelete={remove}
        />
      )}

      {showCreate && currentTerm && (
        <SlotModal classArmId={classArmId} termId={currentTerm.id} onClose={() => setShowCreate(false)} onSaved={refetch} />
      )}
      {editing && currentTerm && (
        <SlotModal
          classArmId={classArmId}
          termId={currentTerm.id}
          slot={editing}
          onClose={() => setEditing(null)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}

function SlotModal({
  classArmId,
  termId,
  slot,
  onClose,
  onSaved,
}: {
  classArmId: string;
  termId: string;
  slot?: TimetableSlot;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: subjects } = useSubjects();
  const { data: staff } = useFetch<StaffUser[]>("/users?role=TEACHER");

  const [form, setForm] = useState({
    subjectId: slot?.subjectId ?? "",
    teacherId: slot?.teacherId ?? "",
    dayOfWeek: slot?.dayOfWeek ?? ("MONDAY" as DayOfWeek),
    startTime: slot?.startTime ?? "",
    endTime: slot?.endTime ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (slot) {
        await api.patch(`/timetable/${slot.id}`, form);
      } else {
        await api.post("/timetable", { ...form, classArmId, termId });
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
    <Modal title={slot ? "Edit timetable slot" : "Add timetable slot"} onClose={onClose}>
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
          <Label>Teacher</Label>
          <Select required value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
            <option value="">Select</option>
            {staff
              ?.filter((s) => s.teacher)
              .map((s) => (
                <option key={s.teacher!.id} value={s.teacher!.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <Label>Day</Label>
          <Select required value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value as DayOfWeek })}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {DAY_LABELS[d]}
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </div>
          <div>
            <Label>End time</Label>
            <input
              type="time"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : slot ? "Save changes" : "Add slot"}
        </Button>
      </form>
    </Modal>
  );
}

function StudentTimetableView() {
  const { currentTerm } = useCurrentTerm();
  const query = currentTerm ? `/timetable/students/me?termId=${currentTerm.id}` : null;
  const { data: slots, loading, error } = useFetch<TimetableSlot[]>(query, [currentTerm?.id]);

  return (
    <div>
      <PageHeader title="My Timetable" subtitle="Your weekly class schedule" />
      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : <Grid slots={slots ?? []} canManage={false} />}
    </div>
  );
}
