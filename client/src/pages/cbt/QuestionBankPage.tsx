import { FormEvent, useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner, Table } from "../../components/ui";
import { useClassLevels, useSubjects } from "../../hooks/useAcademics";
import { useFetch } from "../../hooks/useFetch";
import { GlobalQuestion, GlobalSubject, Paginated, Question, QuestionType } from "../../types";
import { BulkAddQuestionsModal } from "./BulkAddQuestionsModal";

export function QuestionBankPage() {
  const [tab, setTab] = useState<"bank" | "library">("bank");

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Button variant={tab === "bank" ? "primary" : "secondary"} onClick={() => setTab("bank")}>
          My Bank
        </Button>
        <Button variant={tab === "library" ? "primary" : "secondary"} onClick={() => setTab("library")}>
          Exam Practice Library
        </Button>
      </div>
      {tab === "bank" ? <MyBankTab /> : <PracticeLibraryTab />}
    </div>
  );
}

function MyBankTab() {
  const { data: subjects } = useSubjects();
  const { data: classLevels } = useClassLevels();
  const [subjectId, setSubjectId] = useState("");
  const [classLevelId, setClassLevelId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = new URLSearchParams();
  if (subjectId) query.set("subjectId", subjectId);
  if (classLevelId) query.set("classLevelId", classLevelId);

  const { data, loading, error, refetch } = useFetch<Paginated<Question>>(`/cbt/questions?${query}`, [subjectId, classLevelId]);

  async function deleteQuestion(question: Question) {
    if (!confirm("Delete this question from the bank?")) return;
    setActionError(null);
    try {
      await api.delete(`/cbt/questions/${question.id}`);
      refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Question Bank"
        subtitle={`${data?.total ?? 0} questions`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowBulkAdd(true)}>
              Bulk add
            </Button>
            <Button onClick={() => setShowCreate(true)}>+ Add question</Button>
          </>
        }
      />

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

      {(error || actionError) && <ErrorBanner message={error || actionError!} />}
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
              <th className="px-4 py-3"></th>
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

      {showCreate && (
        <QuestionFormModal
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
          onClose={() => setEditQuestion(null)}
          onSaved={() => {
            refetch();
            setEditQuestion(null);
          }}
        />
      )}
      {showBulkAdd && (
        <BulkAddQuestionsModal
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

function PracticeLibraryTab() {
  const { data: subjects } = useFetch<GlobalSubject[]>("/cbt/practice-library/subjects");
  const [globalSubjectId, setGlobalSubjectId] = useState("");
  const [examBoard, setExamBoard] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = new URLSearchParams({ pageSize: "50" });
  if (globalSubjectId) query.set("globalSubjectId", globalSubjectId);
  if (examBoard) query.set("examBoard", examBoard);

  const { data, loading, error, refetch } = useFetch<Paginated<GlobalQuestion>>(`/cbt/practice-library/questions?${query}`, [globalSubjectId, examBoard]);

  function toggle(id: string) {
    setSelected((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  return (
    <div>
      <PageHeader
        title="Exam Practice Library"
        subtitle="Original WAEC/NECO/UTME-style practice questions, shared across every school"
        actions={
          <Button disabled={!selected.length} onClick={() => setShowImport(true)}>
            Import selected ({selected.length})
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
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
      </div>

      {(error || actionError) && <ErrorBanner message={error || actionError!} />}
      {loading ? (
        <Spinner />
      ) : !data?.items.length ? (
        <EmptyState message="No practice questions match this filter yet." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Board</th>
              <th className="px-4 py-3">Topic</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((q) => (
              <tr key={q.id}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.includes(q.id)} onChange={() => toggle(q.id)} />
                </td>
                <td className="max-w-md truncate px-4 py-3 text-slate-800">{q.text}</td>
                <td className="px-4 py-3 text-slate-600">{q.globalSubject?.name}</td>
                <td className="px-4 py-3">
                  <Badge>{q.examBoard}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{q.topic ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showImport && (
        <ImportModal
          globalQuestionIds={selected}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            setSelected([]);
            refetch();
          }}
          onError={setActionError}
        />
      )}
    </div>
  );
}

function ImportModal({
  globalQuestionIds,
  onClose,
  onImported,
  onError,
}: {
  globalQuestionIds: string[];
  onClose: () => void;
  onImported: () => void;
  onError: (message: string) => void;
}) {
  const { data: subjects } = useSubjects();
  const { data: classLevels } = useClassLevels();
  const [subjectId, setSubjectId] = useState("");
  const [classLevelId, setClassLevelId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/cbt/practice-library/import", { globalQuestionIds, subjectId, classLevelId });
      onImported();
    } catch (err) {
      const message = apiErrorMessage(err);
      setError(message);
      onError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Import ${globalQuestionIds.length} question(s) into my bank`} onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>File under subject</Label>
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
          <Label>File under class level</Label>
          <Select required value={classLevelId} onChange={(e) => setClassLevelId(e.target.value)}>
            <option value="">Select</option>
            {classLevels?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Importing..." : "Import into my bank"}
        </Button>
      </form>
    </Modal>
  );
}

function QuestionFormModal({ question, onClose, onSaved }: { question?: Question; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!question;
  const { data: subjects } = useSubjects();
  const { data: classLevels } = useClassLevels();
  const [type, setType] = useState<QuestionType>(question?.type ?? "MULTIPLE_CHOICE");
  const [text, setText] = useState(question?.text ?? "");
  const [subjectId, setSubjectId] = useState(question?.subjectId ?? "");
  const [classLevelId, setClassLevelId] = useState(question?.classLevelId ?? "");
  const [topic, setTopic] = useState(question?.topic ?? "");
  const [points, setPoints] = useState(String(question?.points ?? 1));
  const [imageUrl, setImageUrl] = useState(question?.imageUrl ?? "");
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
      if (isEdit) {
        const payload: Record<string, unknown> = {
          topic: topic || undefined,
          text,
          imageUrl: imageUrl || undefined,
          points: Number(points),
        };
        if (optionsDirty && (type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE")) {
          payload.options = type === "TRUE_FALSE" ? [{ text: "True", isCorrect: options[0]?.isCorrect ?? true }, { text: "False", isCorrect: !(options[0]?.isCorrect ?? true) }] : options;
        }
        if (type === "FILL_IN_BLANK") payload.correctText = correctText;
        await api.patch(`/cbt/questions/${question!.id}`, payload);
      } else {
        const payload: Record<string, unknown> = {
          type,
          text,
          subjectId,
          classLevelId,
          topic: topic || undefined,
          imageUrl: imageUrl || undefined,
          points: Number(points),
        };
        if (type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE") {
          payload.options = type === "TRUE_FALSE" ? [{ text: "True", isCorrect: options[0]?.isCorrect ?? true }, { text: "False", isCorrect: !(options[0]?.isCorrect ?? true) }] : options;
        }
        if (type === "FILL_IN_BLANK") payload.correctText = correctText;
        await api.post("/cbt/questions", payload);
      }
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit question" : "Add a question"} onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Subject</Label>
            <Select required disabled={isEdit} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
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
            <Select required disabled={isEdit} value={classLevelId} onChange={(e) => setClassLevelId(e.target.value)}>
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
          <Select disabled={isEdit} value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
            <option value="MULTIPLE_CHOICE">Multiple choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="FILL_IN_BLANK">Fill in the blank</option>
            <option value="THEORY">Theory</option>
          </Select>
          {isEdit && <p className="mt-1 text-xs text-slate-400">Subject, class level and question type can't be changed after creation.</p>}
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
        <div>
          <Label>Image URL (optional)</Label>
          <Input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
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
