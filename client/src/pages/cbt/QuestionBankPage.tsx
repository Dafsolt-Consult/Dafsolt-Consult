import { FormEvent, useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner, Table } from "../../components/ui";
import { useClassLevels, useSubjects } from "../../hooks/useAcademics";
import { useFetch } from "../../hooks/useFetch";
import { Paginated, Question, QuestionType } from "../../types";

export function QuestionBankPage() {
  const { data: subjects } = useSubjects();
  const { data: classLevels } = useClassLevels();
  const [subjectId, setSubjectId] = useState("");
  const [classLevelId, setClassLevelId] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const query = new URLSearchParams();
  if (subjectId) query.set("subjectId", subjectId);
  if (classLevelId) query.set("classLevelId", classLevelId);

  const { data, loading, error, refetch } = useFetch<Paginated<Question>>(`/cbt/questions?${query}`, [subjectId, classLevelId]);

  return (
    <div>
      <PageHeader title="Question Bank" subtitle={`${data?.total ?? 0} questions`} actions={<Button onClick={() => setShowCreate(true)}>+ Add question</Button>} />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select className="w-52" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">All subjects</option>
          {subjects?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select className="w-52" value={classLevelId} onChange={(e) => setClassLevelId(e.target.value)}>
          <option value="">All class levels</option>
          {classLevels?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !data?.items.length ? (
        <EmptyState message="No questions yet. Add your first question to build the bank." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Difficulty</th>
              <th className="px-4 py-3">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((q) => (
              <tr key={q.id}>
                <td className="max-w-md truncate px-4 py-3 text-slate-800">{q.text}</td>
                <td className="px-4 py-3 text-slate-600">{q.subject?.name}</td>
                <td className="px-4 py-3">
                  <Badge>{q.type.replace("_", " ")}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{q.difficulty}</td>
                <td className="px-4 py-3 text-slate-600">{q.points}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showCreate && <CreateQuestionModal onClose={() => setShowCreate(false)} onCreated={refetch} />}
    </div>
  );
}

function CreateQuestionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: subjects } = useSubjects();
  const { data: classLevels } = useClassLevels();
  const [type, setType] = useState<QuestionType>("MULTIPLE_CHOICE");
  const [text, setText] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classLevelId, setClassLevelId] = useState("");
  const [topic, setTopic] = useState("");
  const [points, setPoints] = useState("1");
  const [correctText, setCorrectText] = useState("");
  const [options, setOptions] = useState([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateOption(index: number, field: "text" | "isCorrect", value: string | boolean) {
    setOptions((opts) =>
      opts.map((o, i) => {
        if (i === index) return { ...o, [field]: value };
        if (field === "isCorrect" && value === true) return { ...o, isCorrect: false };
        return o;
      })
    );
  }

  function addOption() {
    setOptions((opts) => [...opts, { text: "", isCorrect: false }]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        type,
        text,
        subjectId,
        classLevelId,
        topic: topic || undefined,
        points: Number(points),
      };
      if (type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE") {
        payload.options = type === "TRUE_FALSE" ? [{ text: "True", isCorrect: options[0]?.isCorrect ?? true }, { text: "False", isCorrect: !(options[0]?.isCorrect ?? true) }] : options;
      }
      if (type === "FILL_IN_BLANK") payload.correctText = correctText;
      await api.post("/cbt/questions", payload);
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add a question" onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Subject</Label>
            <Select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
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
            <Select required value={classLevelId} onChange={(e) => setClassLevelId(e.target.value)}>
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
          <Label>Topic (optional)</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div>
          <Label>Question type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
            <option value="MULTIPLE_CHOICE">Multiple choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="FILL_IN_BLANK">Fill in the blank</option>
            <option value="THEORY">Theory</option>
          </Select>
        </div>
        <div>
          <Label>Question text</Label>
          <textarea
            required
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {type === "MULTIPLE_CHOICE" && (
          <div className="space-y-2">
            <Label>Options (mark the correct one)</Label>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={o.isCorrect} onChange={() => updateOption(i, "isCorrect", true)} />
                <Input required value={o.text} onChange={(e) => updateOption(i, "text", e.target.value)} placeholder={`Option ${i + 1}`} />
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addOption}>
              + Add option
            </Button>
          </div>
        )}

        {type === "TRUE_FALSE" && (
          <div>
            <Label>Correct answer</Label>
            <Select
              value={options[0]?.isCorrect ? "true" : "false"}
              onChange={(e) => setOptions([{ text: "True", isCorrect: e.target.value === "true" }])}
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </Select>
          </div>
        )}

        {type === "FILL_IN_BLANK" && (
          <div>
            <Label>Correct answer</Label>
            <Input required value={correctText} onChange={(e) => setCorrectText(e.target.value)} />
          </div>
        )}

        <div>
          <Label>Points</Label>
          <Input type="number" min={1} value={points} onChange={(e) => setPoints(e.target.value)} />
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : "Add question"}
        </Button>
      </form>
    </Modal>
  );
}
