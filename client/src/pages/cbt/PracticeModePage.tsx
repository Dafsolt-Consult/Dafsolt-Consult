import { useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, ErrorBanner, Label, PageHeader, Select } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { GlobalSubject, QuestionType } from "../../types";

interface PracticeQuestion {
  id: string;
  subject: string;
  examBoard: string;
  year: number | null;
  topic: string | null;
  type: QuestionType;
  text: string;
  imageUrl: string | null;
  points: number;
  options: { id: string; text: string }[];
}

interface PracticeResult {
  questionId: string;
  isCorrect: boolean;
  correctOptionId: string | null;
  correctText: string | null;
}

interface PracticeCheckResponse {
  score: number;
  total: number;
  results: PracticeResult[];
}

type Phase = "setup" | "quiz" | "results";

export function PracticeModePage() {
  const { data: subjects } = useFetch<GlobalSubject[]>("/cbt/practice/subjects");
  const [phase, setPhase] = useState<Phase>("setup");
  const [subjectId, setSubjectId] = useState("");
  const [examBoard, setExamBoard] = useState("");
  const [count, setCount] = useState("20");
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, { selectedOptionId?: string; textAnswer?: string }>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PracticeCheckResponse | null>(null);

  async function startPractice() {
    setError(null);
    setLoading(true);
    try {
      const query = new URLSearchParams({ count });
      if (subjectId) query.set("globalSubjectId", subjectId);
      if (examBoard) query.set("examBoard", examBoard);
      const { data } = await api.get<{ questions: PracticeQuestion[] }>(`/cbt/practice/questions?${query}`);
      if (!data.questions.length) {
        setError("No practice questions match this filter yet.");
        return;
      }
      setQuestions(data.questions);
      setAnswers({});
      setCurrent(0);
      setResults(null);
      setPhase("quiz");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitPractice() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedOptionId: answers[q.id]?.selectedOptionId,
          textAnswer: answers[q.id]?.textAnswer,
        })),
      };
      const { data } = await api.post<PracticeCheckResponse>("/cbt/practice/check", payload);
      setResults(data);
      setPhase("results");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setPhase("setup");
    setQuestions([]);
    setAnswers({});
    setResults(null);
    setError(null);
  }

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title="CBT Practice" subtitle="Practice-style questions by subject, exam board, or mixed mode" />
        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}
        <Card>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">All subjects (mixed)</option>
                {subjects?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Exam board</Label>
              <Select value={examBoard} onChange={(e) => setExamBoard(e.target.value)}>
                <option value="">All boards</option>
                <option value="WAEC">WAEC</option>
                <option value="NECO">NECO</option>
                <option value="UTME">UTME</option>
              </Select>
            </div>
            <div>
              <Label>Number of questions</Label>
              <Select value={count} onChange={(e) => setCount(e.target.value)}>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="40">40</option>
              </Select>
            </div>
            <Button className="w-full" disabled={loading} onClick={startPractice}>
              {loading ? "Loading..." : "Start practice"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "results" && results) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Practice results"
          subtitle={`Score: ${results.score} / ${results.total}`}
          actions={<Button onClick={restart}>Practice again</Button>}
        />
        <div className="space-y-3">
          {questions.map((q) => {
            const r = results.results.find((res) => res.questionId === q.id);
            return (
              <Card key={q.id}>
                <p className="text-sm font-medium text-slate-800">{q.text}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone={r?.isCorrect ? "success" : "danger"}>{r?.isCorrect ? "Correct" : "Incorrect"}</Badge>
                  {q.topic && <span className="text-xs text-slate-400">{q.topic}</span>}
                </div>
                {!r?.isCorrect && (
                  <p className="mt-2 text-xs text-slate-500">
                    Correct answer: {q.options.find((o) => o.id === r?.correctOptionId)?.text ?? r?.correctText ?? "—"}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const question = questions[current];
  const answeredCount = questions.filter((q) => answers[q.id]?.selectedOptionId || answers[q.id]?.textAnswer).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="font-semibold text-slate-800">CBT Practice</h1>
          <p className="text-xs text-slate-500">
            {answeredCount}/{questions.length} answered
          </p>
        </div>
        {question && (
          <Badge>
            {question.examBoard}
            {question.year ? ` · ${question.year}` : ""}
          </Badge>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1">
        {questions.map((q, i) => {
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
            Question {current + 1} of {questions.length} · {question.subject} · {question.points} pts
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
                    onChange={() => setAnswers((a) => ({ ...a, [question.id]: { selectedOptionId: opt.id } }))}
                  />
                  {opt.text}
                </label>
              ))}
            </div>
          )}

          {question.type === "FILL_IN_BLANK" && (
            <input
              value={answers[question.id]?.textAnswer ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [question.id]: { textAnswer: e.target.value } }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Type your answer..."
            />
          )}

          <div className="mt-6 flex justify-between">
            <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
              Previous
            </Button>
            {current < questions.length - 1 ? (
              <Button onClick={() => setCurrent((c) => c + 1)}>Next</Button>
            ) : (
              <Button disabled={submitting} onClick={submitPractice}>
                {submitting ? "Checking..." : "Finish & check answers"}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
