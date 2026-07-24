import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, ErrorBanner, Input, PageHeader, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { QuestionOption, QuestionType } from "../../types";

interface GradingAnswer {
  id: string;
  questionId: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isCorrect: boolean | null;
  pointsAwarded: number;
  gradedAt: string | null;
  question: {
    text: string;
    type: QuestionType;
    points: number;
    correctText: string | null;
    options: QuestionOption[];
  };
  selectedOption: QuestionOption | null;
}

interface GradingAttempt {
  id: string;
  status: string;
  totalScore: number;
  student: { user: { firstName: string; lastName: string } };
  answers: GradingAnswer[];
}

export function GradingPage() {
  const { examId, attemptId } = useParams<{ examId: string; attemptId: string }>();
  const { data: attempt, loading, error, refetch, setData } = useFetch<GradingAttempt>(`/cbt/attempts/${attemptId}/grading`);
  const [gradeError, setGradeError] = useState<string | null>(null);

  async function handleGraded(answerId: string, updatedAttempt: { totalScore: number; status: string }) {
    setGradeError(null);
    if (!attempt) return;
    setData({ ...attempt, totalScore: updatedAttempt.totalScore, status: updatedAttempt.status });
    refetch();
  }

  if (error) return <ErrorBanner message={error} />;
  if (loading || !attempt) return <Spinner />;

  const theoryAnswers = attempt.answers.filter((a) => a.question.type === "THEORY");
  const objectiveAnswers = attempt.answers.filter((a) => a.question.type !== "THEORY");

  return (
    <div>
      <PageHeader
        title={`Grade: ${attempt.student.user.firstName} ${attempt.student.user.lastName}`}
        subtitle={`Total score: ${attempt.totalScore}`}
        actions={
          examId ? (
            <Link to={`/cbt/exams/${examId}`}>
              <Button variant="secondary">Back to exam</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="-mt-4 mb-4">
        <Badge tone={attempt.status === "GRADED" ? "success" : "warning"}>{attempt.status}</Badge>
      </div>

      {gradeError && (
        <div className="mb-4">
          <ErrorBanner message={gradeError} />
        </div>
      )}

      {theoryAnswers.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 font-medium text-slate-800">Theory answers ({theoryAnswers.length})</h3>
          <div className="space-y-3">
            {theoryAnswers.map((answer) => (
              <TheoryAnswerCard key={answer.id} attemptId={attemptId!} answer={answer} onGraded={handleGraded} onError={setGradeError} />
            ))}
          </div>
        </div>
      )}

      {objectiveAnswers.length > 0 && (
        <div>
          <h3 className="mb-3 font-medium text-slate-800">Auto-graded answers ({objectiveAnswers.length})</h3>
          <div className="space-y-2">
            {objectiveAnswers.map((answer) => (
              <Card key={answer.id}>
                <p className="text-sm font-medium text-slate-800">{answer.question.text}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Answer: {answer.selectedOption?.text ?? answer.textAnswer ?? <span className="italic text-slate-400">No answer</span>}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone={answer.isCorrect ? "success" : "danger"}>{answer.isCorrect ? "Correct" : "Incorrect"}</Badge>
                  <span className="text-xs text-slate-500">
                    {answer.pointsAwarded} / {answer.question.points} pts
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!attempt.answers.length && <p className="text-sm text-slate-500">No answers submitted for this attempt.</p>}
    </div>
  );
}

function TheoryAnswerCard({
  attemptId,
  answer,
  onGraded,
  onError,
}: {
  attemptId: string;
  answer: GradingAnswer;
  onGraded: (answerId: string, updatedAttempt: { totalScore: number; status: string }) => void;
  onError: (message: string) => void;
}) {
  const [points, setPoints] = useState(String(answer.pointsAwarded));
  const [submitting, setSubmitting] = useState(false);
  const graded = !!answer.gradedAt;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onError("");
    setSubmitting(true);
    try {
      const { data } = await api.patch(`/cbt/attempts/${attemptId}/answers/${answer.id}/grade`, {
        pointsAwarded: Number(points),
      });
      onGraded(answer.id, data);
    } catch (err) {
      onError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <p className="text-sm font-medium text-slate-800">{answer.question.text}</p>
      {answer.question.correctText && <p className="mt-1 text-xs italic text-slate-400">Model answer: {answer.question.correctText}</p>}
      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        {answer.textAnswer || <span className="italic text-slate-400">No answer submitted</span>}
      </p>
      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={answer.question.points}
          className="w-24"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
        />
        <span className="text-xs text-slate-500">/ {answer.question.points} pts</span>
        <Button type="submit" variant={graded ? "secondary" : "primary"} disabled={submitting}>
          {submitting ? "Saving..." : graded ? "Update grade" : "Save grade"}
        </Button>
        {graded && <Badge tone="success">Graded</Badge>}
      </form>
    </Card>
  );
}
