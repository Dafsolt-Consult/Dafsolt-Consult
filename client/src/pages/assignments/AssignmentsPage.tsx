import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { useClassArms, useSubjects } from "../../hooks/useAcademics";
import { Assignment, AssignmentSubmission } from "../../types";

export function AssignmentsPage() {
  const { user } = useAuth();
  if (user?.role === "STUDENT") return <StudentAssignmentsView />;
  return <StaffAssignmentsView />;
}

function StaffAssignmentsView() {
  const { data: classArms } = useClassArms();
  const [classArmId, setClassArmId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Assignment | null>(null);

  const query = classArmId ? `?classArmId=${classArmId}` : "";
  const { data: assignments, loading, error, refetch } = useFetch<Assignment[]>(`/assignments${query}`, [classArmId]);

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle="Post assignments, track submissions and grade them"
        actions={<Button onClick={() => setShowCreate(true)}>+ New assignment</Button>}
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
      ) : !assignments?.length ? (
        <EmptyState message="No assignments posted yet." />
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <Card key={a.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{a.title}</p>
                <p className="text-sm text-slate-500">
                  {a.subject?.name} · {a.classArm?.classLevel.name} {a.classArm?.name} · Due {new Date(a.dueDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{a._count?.submissions ?? 0} submissions</Badge>
                <Button variant="secondary" onClick={() => setSelected(a)}>
                  View & grade
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <CreateAssignmentModal onClose={() => setShowCreate(false)} onCreated={refetch} />}
      {selected && <GradeAssignmentModal assignmentId={selected.id} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CreateAssignmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: classArms } = useClassArms();
  const { data: subjects } = useSubjects();
  const [form, setForm] = useState({ classArmId: "", subjectId: "", title: "", description: "", dueDate: "", totalPoints: "100" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/assignments", { ...form, totalPoints: Number(form.totalPoints) });
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New assignment" onClose={onClose}>
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
          <Label>Description</Label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Due date</Label>
            <Input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div>
            <Label>Total points</Label>
            <Input type="number" min={1} value={form.totalPoints} onChange={(e) => setForm({ ...form, totalPoints: e.target.value })} />
          </div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Posting..." : "Post assignment"}
        </Button>
      </form>
    </Modal>
  );
}

function GradeAssignmentModal({ assignmentId, onClose }: { assignmentId: string; onClose: () => void }) {
  const { data: assignment, refetch } = useFetch<Assignment>(`/assignments/${assignmentId}`);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function grade(studentId: string) {
    setError(null);
    try {
      await api.patch(`/assignments/${assignmentId}/submissions/${studentId}/grade`, {
        score: Number(drafts[studentId] ?? 0),
      });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Modal title={assignment?.title ?? "Assignment"} onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <div className="space-y-3">
        {assignment?.submissions?.length ? (
          assignment.submissions.map((s: AssignmentSubmission) => (
            <Card key={s.id}>
              <p className="font-medium text-slate-800">
                {s.student?.user.firstName} {s.student?.user.lastName}
              </p>
              {s.submissionText && <p className="mt-1 text-sm text-slate-600">{s.submissionText}</p>}
              {s.attachmentUrl && (
                <a href={s.attachmentUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-700 hover:underline">
                  View attachment
                </a>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={assignment.totalPoints}
                  className="w-24"
                  placeholder={s.score != null ? String(s.score) : "Score"}
                  value={drafts[s.studentId] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [s.studentId]: e.target.value }))}
                />
                <span className="text-sm text-slate-500">/ {assignment.totalPoints}</span>
                <Button variant="secondary" onClick={() => grade(s.studentId)}>
                  {s.gradedAt ? "Update grade" : "Grade"}
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-sm text-slate-500">No submissions yet.</p>
        )}
      </div>
    </Modal>
  );
}

function StudentAssignmentsView() {
  const { data: assignments, loading, error, refetch } = useFetch<Assignment[]>("/assignments/students/me");
  const [error2, setError2] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function submit(assignmentId: string) {
    setError2(null);
    try {
      await api.post(`/assignments/${assignmentId}/submit`, { submissionText: drafts[assignmentId] ?? "" });
      refetch();
    } catch (err) {
      setError2(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="My Assignments" subtitle="Upcoming and completed assignments" />
      {error && <ErrorBanner message={error} />}
      {error2 && (
        <div className="mb-4">
          <ErrorBanner message={error2} />
        </div>
      )}
      {loading ? (
        <Spinner />
      ) : !assignments?.length ? (
        <EmptyState message="No assignments yet." />
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-slate-800">{a.title}</h3>
                  <p className="text-sm text-slate-500">
                    {a.subject?.name} · Due {new Date(a.dueDate).toLocaleDateString()} · {a.totalPoints} pts
                  </p>
                  {a.description && <p className="mt-2 text-sm text-slate-600">{a.description}</p>}
                </div>
                {a.mySubmission?.gradedAt ? (
                  <Badge tone="success">
                    Graded: {a.mySubmission.score}/{a.totalPoints}
                  </Badge>
                ) : a.mySubmission?.submittedAt ? (
                  <Badge tone="warning">Submitted</Badge>
                ) : (
                  <Badge tone="danger">Not submitted</Badge>
                )}
              </div>

              {a.mySubmission?.feedback && (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <span className="font-medium">Feedback:</span> {a.mySubmission.feedback}
                </p>
              )}

              {!a.mySubmission?.gradedAt && (
                <div className="mt-3 space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Type your answer or notes..."
                    defaultValue={a.mySubmission?.submissionText ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <Button onClick={() => submit(a.id)}>{a.mySubmission?.submittedAt ? "Resubmit" : "Submit"}</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
