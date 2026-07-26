import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { kioskApi, kioskTokenStore } from "../../api/kioskClient";
import { apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, PageHeader, Spinner } from "../../components/ui";

interface AvailableExam {
  id: string;
  title: string;
  durationMinutes: number;
  subject: { name: string };
  _count: { examQuestions: number };
  attempts: { id: string; status: string }[];
}

export function KioskAvailableExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<AvailableExam[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    kioskApi
      .get<AvailableExam[]>("/exams/available")
      .then(({ data }) => setExams(data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function start(examId: string) {
    setStartError(null);
    try {
      const { data } = await kioskApi.post(`/exams/${examId}/start`);
      navigate(`/kiosk/attempts/${data.attemptId}`);
    } catch (err) {
      setStartError(apiErrorMessage(err));
    }
  }

  function logOut() {
    kioskTokenStore.clear();
    navigate("/kiosk/login");
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <PageHeader
        title="My Exams"
        subtitle="Exams currently open for your class"
        actions={
          <Button variant="secondary" onClick={logOut}>
            Log out of kiosk
          </Button>
        }
      />
      {error && <ErrorBanner message={error} />}
      {startError && (
        <div className="mb-4">
          <ErrorBanner message={startError} />
        </div>
      )}
      {loading ? (
        <Spinner />
      ) : !exams?.length ? (
        <EmptyState message="No exams are open for you right now. Check with your invigilator." />
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
                    <Button className="w-full" onClick={() => navigate(`/kiosk/attempts/${attempt.id}`)}>
                      Resume exam
                    </Button>
                  )}
                  {attempt && attempt.status !== "IN_PROGRESS" && <Badge tone="success">Submitted</Badge>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
