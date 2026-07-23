import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, ErrorBanner, PageHeader, Select, Table } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { Exam, ExamStatus, Paginated, Question } from "../../types";

interface ExamDetail extends Exam {
  examQuestions: { question: Question }[];
}

interface AttemptRow {
  id: string;
  status: string;
  totalScore: number;
  student: { user: { firstName: string; lastName: string } };
}

export function ExamDetailPage() {
  const { examId } = useParams<{ examId: string }>();
  const [tab, setTab] = useState<"questions" | "results">("questions");
  const { data: exam, error, refetch } = useFetch<ExamDetail>(`/cbt/exams/${examId}`);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function updateStatus(status: ExamStatus) {
    setStatusError(null);
    try {
      await api.patch(`/cbt/exams/${examId}`, { status });
      refetch();
    } catch (err) {
      setStatusError(apiErrorMessage(err));
    }
  }

  if (error) return <ErrorBanner message={error} />;
  if (!exam) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div>
      <PageHeader
        title={exam.title}
        subtitle={`${exam.subject?.name} · ${exam.classLevel?.name} · ${exam.durationMinutes} minutes`}
        actions={
          <Select value={exam.status} onChange={(e) => updateStatus(e.target.value as ExamStatus)} className="w-40">
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        }
      />
      {statusError && (
        <div className="mb-4">
          <ErrorBanner message={statusError} />
        </div>
      )}

      <div className="mb-6 flex gap-2 border-b border-slate-200">
        {(["questions", "results"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "questions" && <QuestionsTab exam={exam} onChanged={refetch} />}
      {tab === "results" && <ResultsTab examId={exam.id} />}
    </div>
  );
}

function QuestionsTab({ exam, onChanged }: { exam: ExamDetail; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const query = new URLSearchParams({ subjectId: exam.subjectId, classLevelId: exam.classLevelId, pageSize: "50" });
  const { data: bank } = useFetch<Paginated<Question>>(`/cbt/questions?${query}`);

  const attachedIds = new Set(exam.examQuestions.map((eq) => eq.question.id));
  const available = bank?.items.filter((q) => !attachedIds.has(q.id)) ?? [];

  async function addQuestion(questionId: string) {
    setError(null);
    try {
      await api.post(`/cbt/exams/${exam.id}/questions`, { questionIds: [questionId] });
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function removeQuestion(questionId: string) {
    setError(null);
    try {
      await api.delete(`/cbt/exams/${exam.id}/questions/${questionId}`);
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {error && (
        <div className="lg:col-span-2">
          <ErrorBanner message={error} />
        </div>
      )}
      <Card>
        <h3 className="mb-3 font-medium text-slate-800">Attached questions ({exam.examQuestions.length})</h3>
        <div className="space-y-2">
          {exam.examQuestions.map(({ question }) => (
            <div key={question.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2">
              <span className="truncate text-sm text-slate-700">{question.text}</span>
              <Button variant="ghost" onClick={() => removeQuestion(question.id)}>
                Remove
              </Button>
            </div>
          ))}
          {!exam.examQuestions.length && <p className="text-sm text-slate-500">No questions attached yet.</p>}
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 font-medium text-slate-800">Available from bank ({available.length})</h3>
        <div className="space-y-2">
          {available.map((q) => (
            <div key={q.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2">
              <span className="truncate text-sm text-slate-700">{q.text}</span>
              <Button variant="secondary" onClick={() => addQuestion(q.id)}>
                Add
              </Button>
            </div>
          ))}
          {!available.length && <p className="text-sm text-slate-500">No more matching questions in the bank.</p>}
        </div>
      </Card>
    </div>
  );
}

function ResultsTab({ examId }: { examId: string }) {
  const { data: attempts } = useFetch<AttemptRow[]>(`/cbt/exams/${examId}/results`);

  if (!attempts?.length) return <p className="text-sm text-slate-500">No attempts submitted yet.</p>;

  return (
    <Table>
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
        <tr>
          <th className="px-4 py-3">Student</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Score</th>
          <th className="px-4 py-3"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {attempts.map((a) => (
          <tr key={a.id}>
            <td className="px-4 py-3 font-medium text-slate-800">
              {a.student.user.firstName} {a.student.user.lastName}
            </td>
            <td className="px-4 py-3">
              <Badge tone={a.status === "GRADED" ? "success" : "warning"}>{a.status}</Badge>
            </td>
            <td className="px-4 py-3">{a.totalScore}</td>
            <td className="px-4 py-3">
              {a.status !== "IN_PROGRESS" && (
                <Link to={`/cbt/exams/${examId}/attempts/${a.id}/grade`}>
                  <Button variant="secondary">{a.status === "GRADED" ? "Review" : "Grade"}</Button>
                </Link>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
