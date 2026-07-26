import { FormEvent, useState } from "react";
import { platformApi } from "../../api/platformClient";
import { apiErrorMessage } from "../../api/client";
import { Badge, Button, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner, Table } from "../../components/ui";
import { usePlatformFetch } from "../../hooks/usePlatformFetch";
import { ExamBoard, GlobalQuestion, GlobalSubject, Paginated, QuestionType, SchoolStage } from "../../types";
import { BulkAddGlobalQuestionsModal } from "./BulkAddGlobalQuestionsModal";

export function PlatformGlobalQuestionsPage() {
  const { data: subjects, refetch: refetchSubjects } = usePlatformFetch<GlobalSubject[]>("/global-subjects");
  const [globalSubjectId, setGlobalSubjectId] = useState("");
  const [examBoard, setExamBoard] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editQuestion, setEditQuestion] = useState<GlobalQuestion | null>(null);
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = new URLSearchParams({ pageSize: "50" });
  if (globalSubjectId) query.set("globalSubjectId", globalSubjectId);
  if (examBoard) query.set("examBoard", examBoard);

  const { data, loading, error, refetch } = usePlatformFetch<Paginated<GlobalQuestion>>(`/global-questions?${query}`, [globalSubjectId, examBoard]);

  async function deleteQuestion(question: GlobalQuestion) {
    if (!confirm("Delete this practice question from the shared library?")) return;
    setActionError(null);
    try {
      await platformApi.delete(`/global-questions/${question.id}`);
      refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Exam Practice Library"
        subtitle={`${data?.total ?? 0} practice questions, visible to every school`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowBulkAdd(true)}>
              Bulk add
            </Button>
            <Button onClick={() => setShowCreate(true)}>+ Add question</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select className="w-52" value={globalSubjectId} onChange={(e) => setGlobalSubjectId(e.target.value)}>
          <option value="">All subjects</option>
          {subjects?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select className="w-52" value={examBoard} onChange={(e) => setExamBoard(e.target.value)}>
          <option value="">All exam boards</option>
          <option value="WAEC">WAEC</option>
          <option value="NECO">NECO</option>
          <option value="UTME">UTME</option>
          <option value="GENERAL">General</option>
        </Select>
        <Button variant="secondary" onClick={() => setShowNewSubject(true)}>
          + New subject
        </Button>
      </div>

      {(error || actionError) && <ErrorBanner message={error || actionError!} />}
      {loading ? (
        <Spinner />
      ) : !data?.items.length ? (
        <EmptyState message="No practice questions yet. Add the first one to the shared library." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Board</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Topic</th>
              <th className="px-4 py-3">Difficulty</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((q) => (
              <tr key={q.id}>
                <td className="max-w-md truncate px-4 py-3 text-slate-800">{q.text}</td>
                <td className="px-4 py-3 text-slate-600">{q.globalSubject?.name}</td>
                <td className="px-4 py-3">
                  <Badge>{q.examBoard}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{q.year ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{q.topic ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{q.difficulty}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Button variant="ghost" onClick={() => setEditQuestion(q)}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => deleteQuestion(q)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showNewSubject && (
        <NewSubjectModal
          onClose={() => setShowNewSubject(false)}
          onCreated={() => {
            setShowNewSubject(false);
            refetchSubjects();
          }}
        />
      )}
      {showCreate && (
        <QuestionFormModal
          subjects={subjects ?? []}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            refetch();
            setShowCreate(false);
          }}
        />
      )}
      {editQuestion && (
        <QuestionFormModal
          question={editQuestion}
          subjects={subjects ?? []}
          onClose={() => setEditQuestion(null)}
          onSaved={() => {
            refetch();
            setEditQuestion(null);
          }}
        />
      )}
      {showBulkAdd && (
        <BulkAddGlobalQuestionsModal
          subjects={subjects ?? []}
          onClose={() => setShowBulkAdd(false)}
          onSaved={() => {
            refetch();
            setShowBulkAdd(false);
          }}
        />
      )}
    </div>
  );
}

function NewSubjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await platformApi.post("/global-subjects", { name, code });
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New practice-library subject" onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Government" />
        </div>
        <div>
          <Label>Code</Label>
          <Input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. GOV" />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating..." : "Create subject"}
        </Button>
      </form>
    </Modal>
  );
}

function QuestionFormModal({
  question,
  subjects,
  onClose,
  onSaved,
}: {
  question?: GlobalQuestion;
  subjects: GlobalSubject[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!question;
  const [globalSubjectId, setGlobalSubjectId] = useState(question?.globalSubjectId ?? "");
  const [examBoard, setExamBoard] = useState<ExamBoard>(question?.examBoard ?? "WAEC");
  const [stage, setStage] = useState<SchoolStage>(question?.stage ?? "SENIOR_SECONDARY");
  const [type, setType] = useState<QuestionType>(question?.type ?? "MULTIPLE_CHOICE");
  const [text, setText] = useState(question?.text ?? "");
  const [topic, setTopic] = useState(question?.topic ?? "");
  const [points, setPoints] = useState(String(question?.points ?? 1));
  const [year, setYear] = useState(question?.year ? String(question.year) : "");
  const [correctText, setCorrectText] = useState(question?.correctText ?? "");
  const originalOptions = question?.options?.length ? question.options.map((o) => ({ text: o.text, isCorrect: !!o.isCorrect })) : null;
  const [options, setOptions] = useState(
    originalOptions ?? [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ]
  );
  const [optionsDirty, setOptionsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateOption(index: number, field: "text" | "isCorrect", value: string | boolean) {
    setOptionsDirty(true);
    setOptions((opts) =>
      opts.map((o, i) => {
        if (i === index) return { ...o, [field]: value };
        if (field === "isCorrect" && value === true) return { ...o, isCorrect: false };
        return o;
      })
    );
  }

  function addOption() {
    setOptionsDirty(true);
    setOptions((opts) => [...opts, { text: "", isCorrect: false }]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const trueFalseOptions = [
        { text: "True", isCorrect: options[0]?.isCorrect ?? true },
        { text: "False", isCorrect: !(options[0]?.isCorrect ?? true) },
      ];
      if (isEdit) {
        const payload: Record<string, unknown> = {
          topic: topic || undefined,
          text,
          points: Number(points),
          year: year ? Number(year) : undefined,
        };
        if (optionsDirty && (type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE")) {
          payload.options = type === "TRUE_FALSE" ? trueFalseOptions : options;
        }
        if (type === "FILL_IN_BLANK") payload.correctText = correctText;
        await platformApi.patch(`/global-questions/${question!.id}`, payload);
      } else {
        const payload: Record<string, unknown> = {
          globalSubjectId,
          examBoard,
          stage,
          type,
          text,
          topic: topic || undefined,
          points: Number(points),
          year: year ? Number(year) : undefined,
        };
        if (type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE") {
          payload.options = type === "TRUE_FALSE" ? trueFalseOptions : options;
        }
        if (type === "FILL_IN_BLANK") payload.correctText = correctText;
        await platformApi.post("/global-questions", payload);
      }
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit practice question" : "Add a practice question"} onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Subject</Label>
            <Select required disabled={isEdit} value={globalSubjectId} onChange={(e) => setGlobalSubjectId(e.target.value)}>
              <option value="">Select</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Exam board</Label>
            <Select disabled={isEdit} value={examBoard} onChange={(e) => setExamBoard(e.target.value as ExamBoard)}>
              <option value="WAEC">WAEC</option>
              <option value="NECO">NECO</option>
              <option value="UTME">UTME</option>
              <option value="GENERAL">General</option>
            </Select>
          </div>
          <div>
            <Label>Stage</Label>
            <Select disabled={isEdit} value={stage} onChange={(e) => setStage(e.target.value as SchoolStage)}>
              <option value="SENIOR_SECONDARY">Senior secondary (SS1-SS3)</option>
              <option value="JUNIOR_SECONDARY">Junior secondary</option>
              <option value="PRIMARY">Primary</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Topic (optional)</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div>
            <Label>Exam year (optional)</Label>
            <Input
              type="number"
              min={1980}
              max={2100}
              placeholder="e.g. 2019"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Question type</Label>
          <Select disabled={isEdit} value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
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
              onChange={(e) => {
                setOptionsDirty(true);
                setOptions([{ text: "True", isCorrect: e.target.value === "true" }]);
              }}
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
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Add question"}
        </Button>
      </form>
    </Modal>
  );
}
