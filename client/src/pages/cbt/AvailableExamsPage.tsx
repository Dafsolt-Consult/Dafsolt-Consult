import { useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, PageHeader, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { useState } from "react";

interface AvailableExam {
  id: string;
  title: string;
  durationMinutes: number;
  subject: { name: string };
  _count: { examQuestions: number };
  attempts: { id: string; status: string }[];
}

export function AvailableExamsPage() {
  const { data: exams, loading, error } = useFetch<AvailableExam[]>("/cbt/exams/available");
  const [startError, setStartError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function start(examId: string) {
    setStartError(null);
    try {
      const { data } = await api.post(`/cbt/exams/${examId}/start`);
      navigate(`/cbt/attempts/${data.attemptId}`);
    } catch (err) {
      setStartError(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="My Exams" subtitle="Exams currently open for your class" />
      {error && <ErrorBanner message={error} />}
      {startError && (
        <div className="mb-4">
          <ErrorBanner message={startError} />
        </div>
      )}
      {loading ? (
        <Spinner />
      ) : !exams?.length ? (
        <EmptyState message="No exams are open for you right now. Check back later." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((e) => {
            const attempt = e.attempts[0];
            return (
              <Card key={e.id}>
                <h3 className="font-semibold text-slate-800">{e.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{e.subject.name}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <Badge>{e._count.examQuestions} questions</Badge>
                  <Badge>{e.durationMinutes} min</Badge>
                </div>
                <div className="mt-4">
                  {!attempt && (
                    <Button className="w-full" onClick={() => start(e.id)}>
                      Start exam
                    </Button>
                  )}
                  {attempt?.status === "IN_PROGRESS" && (
                    <Button className="w-full" onClick={() => navigate(`/cbt/attempts/${attempt.id}`)}>
                      Resume exam
                    </Button>
                  )}
                  {attempt && attempt.status !== "IN_PROGRESS" && (
                    <Badge tone="success">Submitted</Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
