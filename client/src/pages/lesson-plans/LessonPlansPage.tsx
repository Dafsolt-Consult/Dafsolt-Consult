import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Button, Card, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { pickCurrentSession, useClassArms, useSessions, useSubjects } from "../../hooks/useAcademics";
import { LessonPlan } from "../../types";

export function LessonPlansPage() {
  const { user } = useAuth();
  const [classArmId, setClassArmId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<LessonPlan | null>(null);

  const { data: classArms } = useClassArms();
  const query = classArmId ? `?classArmId=${classArmId}` : "";
  const { data: lessonPlans, loading, error, refetch } = useFetch<LessonPlan[]>(`/lesson-plans${query}`, [classArmId]);

  async function remove(id: string) {
    if (!confirm("Delete this lesson plan?")) return;
    await api.delete(`/lesson-plans/${id}`);
    refetch();
  }

  return (
    <div>
      <PageHeader
        title="Lesson Plans"
        subtitle="Plan topics, objectives and materials for upcoming lessons"
        actions={<Button onClick={() => setShowCreate(true)}>+ New lesson plan</Button>}
      />

      <div className="mb-4 max-w-xs">
        <Select value={classArmId} onChange={(e) => setClassArmId(e.target.value)}>
          <option value="">All classes</option>
          {classArms?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.classLevel?.name} {c.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !lessonPlans?.length ? (
        <EmptyState message="No lesson plans yet." />
      ) : (
        <div className="space-y-2">
          {lessonPlans.map((lp) => (
            <Card key={lp.id} className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-800">{lp.topic}</p>
                <p className="text-sm text-slate-500">
                  {lp.subject?.name} · {lp.classArm?.classLevel.name} {lp.classArm?.name} · {new Date(lp.date).toLocaleDateString()}
                  {user?.role === "SCHOOL_ADMIN" && lp.teacher && ` · ${lp.teacher.user.firstName} ${lp.teacher.user.lastName}`}
                </p>
                {lp.objectives && <p className="mt-2 text-sm text-slate-600">{lp.objectives}</p>}
                {lp.attachmentUrl && (
                  <a href={lp.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-brand-700 hover:underline">
                    View attachment
                  </a>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="secondary" onClick={() => setEditing(lp)}>
                  Edit
                </Button>
                <Button variant="danger" onClick={() => remove(lp.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <LessonPlanModal onClose={() => setShowCreate(false)} onSaved={refetch} />}
      {editing && <LessonPlanModal lessonPlan={editing} onClose={() => setEditing(null)} onSaved={refetch} />}
    </div>
  );
}

function LessonPlanModal({ lessonPlan, onClose, onSaved }: { lessonPlan?: LessonPlan; onClose: () => void; onSaved: () => void }) {
  const { data: classArms } = useClassArms();
  const { data: subjects } = useSubjects();
  const { data: sessions } = useSessions();
  const currentSession = pickCurrentSession(sessions);

  const [form, setForm] = useState({
    classArmId: lessonPlan?.classArmId ?? "",
    subjectId: lessonPlan?.subjectId ?? "",
    termId: lessonPlan?.termId ?? currentSession?.terms?.find((t) => t.isCurrent)?.id ?? "",
    topic: lessonPlan?.topic ?? "",
    objectives: lessonPlan?.objectives ?? "",
    content: lessonPlan?.content ?? "",
    attachmentUrl: lessonPlan?.attachmentUrl ?? "",
    date: lessonPlan?.date ? lessonPlan.date.slice(0, 10) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = { ...form, attachmentUrl: form.attachmentUrl || undefined };
      if (lessonPlan) {
        await api.patch(`/lesson-plans/${lessonPlan.id}`, payload);
      } else {
        await api.post("/lesson-plans", payload);
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
    <Modal title={lessonPlan ? "Edit lesson plan" : "New lesson plan"} onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Topic</Label>
          <Input required value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Class</Label>
            <Select
              required
              disabled={!!lessonPlan}
              value={form.classArmId}
              onChange={(e) => setForm({ ...form, classArmId: e.target.value })}
            >
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
            <Select
              required
              disabled={!!lessonPlan}
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
            >
              <option value="">Select</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Term</Label>
            <Select
              required
              disabled={!!lessonPlan}
              value={form.termId}
              onChange={(e) => setForm({ ...form, termId: e.target.value })}
            >
              <option value="">Select</option>
              {currentSession?.terms?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Lesson date</Label>
            <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Objectives</Label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={form.objectives}
            onChange={(e) => setForm({ ...form, objectives: e.target.value })}
          />
        </div>
        <div>
          <Label>Content / notes</Label>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
        </div>
        <div>
          <Label>Attachment URL (optional)</Label>
          <Input value={form.attachmentUrl} onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })} />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : lessonPlan ? "Save changes" : "Create lesson plan"}
        </Button>
      </form>
    </Modal>
  );
}
