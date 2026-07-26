import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { kioskApi, kioskTokenStore } from "../../api/kioskClient";
import { apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, ErrorBanner, Spinner } from "../../components/ui";

interface AttemptQuestion {
  id: string;
  text: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "THEORY" | "FILL_IN_BLANK";
  imageUrl?: string | null;
  points: number;
  options: { id: string; text: string }[];
}

interface AttemptAnswer {
  questionId: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
}

interface AttemptState {
  attemptId: string;
  title: string;
  instructions?: string | null;
  deadline: string;
  status: string;
  questions: AttemptQuestion[];
  answers: AttemptAnswer[];
}

export function KioskExamTakingPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<AttemptState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, { selectedOptionId?: string; textAnswer?: string }>>({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    kioskApi
      .get<AttemptState>(`/attempts/${attemptId}`)
      .then(({ data }) => {
        setState(data);
        const seeded: Record<string, { selectedOptionId?: string; textAnswer?: string }> = {};
        for (const a of data.answers) {
          seeded[a.questionId] = { selectedOptionId: a.selectedOptionId ?? undefined, textAnswer: a.textAnswer ?? undefined };
        }
        setAnswers(seeded);
        if (data.status !== "IN_PROGRESS") setSubmitted(true);
      })
      .catch((err) => setError(apiErrorMessage(err)));
  }, [attemptId]);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      await kioskApi.post(`/attempts/${attemptId}/submit`);
      setSubmitted(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, [attemptId]);

  useEffect(() => {
    if (!state) return;
    function tick() {
      const remaining = Math.max(0, Math.floor((new Date(state!.deadline).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0 && !submitted) submit();
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state, submit, submitted]);

  async function saveAnswer(questionId: string, payload: { selectedOptionId?: string; textAnswer?: string }) {
    setAnswers((a) => ({ ...a, [questionId]: { ...a[questionId], ...payload } }));
    try {
      await kioskApi.post(`/attempts/${attemptId}/answers`, { questionId, ...payload });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  function logOut() {
    kioskTokenStore.clear();
    navigate("/kiosk/login");
  }

  const timerLabel = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  if (error && !state) return <ErrorBanner message={error} />;
  if (!state) return <Spinner />;

  if (submitted) {
    return (
      <Card className="mx-auto mt-12 max-w-lg text-center">
        <h1 className="text-xl font-semibold text-slate-800">Exam submitted</h1>
        <p className="mt-2 text-sm text-slate-500">Your answers have been recorded. Please wait for your invigilator.</p>
        <Button className="mt-6" onClick={logOut}>
          Log out of kiosk
        </Button>
      </Card>
    );
  }

  const question = state.questions[current];
  const answeredCount = state.questions.filter((q) => {
    const a = answers[q.id];
    return a?.selectedOptionId || a?.textAnswer;
  }).length;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="font-semibold text-slate-800">{state.title}</h1>
          <p className="text-xs text-slate-500">
            {answeredCount}/{state.questions.length} answered
          </p>
        </div>
        <Badge tone={secondsLeft < 60 ? "danger" : "success"}>⏱ {timerLabel}</Badge>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1">
        {state.questions.map((q, i) => {
          const answered = !!(answers[q.id]?.selectedOptionId || answers[q.id]?.textAnswer);
          return (
            <button
              key={q.id}
              onClick={() => setCurrent(i)}
              className={`h-8 w-8 rounded text-xs font-medium ${
                i === current ? "bg-brand-600 text-white" : answered ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-500"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {question && (
        <Card>
          <p className="mb-1 text-xs font-medium uppercase text-slate-400">
            Question {current + 1} of {state.questions.length} · {question.points} pts
          </p>
          <p className="mb-4 whitespace-pre-wrap text-slate-800">{question.text}</p>
          {question.imageUrl && <img src={question.imageUrl} alt="" className="mb-4 max-h-64 rounded-lg" />}

          {(question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && (
            <div className="space-y-2">
              {question.options.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                    answers[question.id]?.selectedOptionId === opt.id ? "border-brand-500 bg-brand-50" : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    checked={answers[question.id]?.selectedOptionId === opt.id}
                    onChange={() => saveAnswer(question.id, { selectedOptionId: opt.id })}
                  />
                  {opt.text}
                </label>
              ))}
            </div>
          )}

          {(question.type === "FILL_IN_BLANK" || question.type === "THEORY") && (
            <textarea
              rows={question.type === "THEORY" ? 8 : 2}
              value={answers[question.id]?.textAnswer ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [question.id]: { ...a[question.id], textAnswer: e.target.value } }))}
              onBlur={(e) => saveAnswer(question.id, { textAnswer: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Type your answer..."
            />
          )}

          <div className="mt-6 flex justify-between">
            <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
              Previous
            </Button>
            {current < state.questions.length - 1 ? (
              <Button onClick={() => setCurrent((c) => c + 1)}>Next</Button>
            ) : (
              <Button
                onClick={() => {
                  if (window.confirm("Submit your exam now? You cannot change your answers afterwards.")) submit();
                }}
              >
                Submit exam
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
