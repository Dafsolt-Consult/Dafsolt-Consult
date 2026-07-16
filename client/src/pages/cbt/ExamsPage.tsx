import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner, Table } from "../../components/ui";
import { useClassLevels, useSessions, useSubjects } from "../../hooks/useAcademics";
import { useFetch } from "../../hooks/useFetch";
import { Exam } from "../../types";

export function ExamsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: exams, loading, error, refetch } = useFetch<Exam[]>("/cbt/exams");

  return (
    <div>
      <PageHeader title="Exams" subtitle="Build and schedule computer-based tests" actions={<Button onClick={() => setShowCreate(true)}>+ Create exam</Button>} />

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !exams?.length ? (
        <EmptyState message="No exams yet. Create one and attach questions from the bank." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Subject / Class</th>
              <th className="px-4 py-3">Questions</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {exams.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{e.title}</td>
                <td className="px-4 py-3 text-slate-600">
                  {e.subject?.name} · {e.classLevel?.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{e._count?.examQuestions ?? 0}</td>
                <td className="px-4 py-3 text-slate-600">{e.durationMinutes} min</td>
                <td className="px-4 py-3">
                  <Badge tone={e.status === "ONGOING" ? "success" : e.status === "DRAFT" ? "default" : "warning"}>{e.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/cbt/exams/${e.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showCreate && <CreateExamModal onClose={() => setShowCreate(false)} onCreated={refetch} />}
    </div>
  );
}

function CreateExamModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: subjects } = useSubjects();
  const { data: classLevels } = useClassLevels();
  const { data: sessions } = useSessions();
  const [form, setForm] = useState({
    title: "",
    subjectId: "",
    classLevelId: "",
    termId: "",
    durationMinutes: "30",
    passMark: "50",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentSession = sessions?.find((s) => s.isCurrent) ?? sessions?.[0];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/cbt/exams", {
        ...form,
        sessionId: currentSession?.id,
        durationMinutes: Number(form.durationMinutes),
        passMark: Number(form.passMark),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Create exam" onClose={onClose}>
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
            <Label>Class level</Label>
            <Select required value={form.classLevelId} onChange={(e) => setForm({ ...form, classLevelId: e.target.value })}>
              <option value="">Select</option>
              {classLevels?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Term</Label>
          <Select required value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })}>
            <option value="">Select</option>
            {currentSession?.terms?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Duration (minutes)</Label>
            <Input type="number" min={5} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          </div>
          <div>
            <Label>Pass mark (%)</Label>
            <Input type="number" min={0} max={100} value={form.passMark} onChange={(e) => setForm({ ...form, passMark: e.target.value })} />
          </div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating..." : "Create exam"}
        </Button>
      </form>
    </Modal>
  );
}
