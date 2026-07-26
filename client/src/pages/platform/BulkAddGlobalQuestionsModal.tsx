import { FormEvent, useState } from "react";
import { platformApi } from "../../api/platformClient";
import { apiErrorMessage } from "../../api/client";
import { Button, ErrorBanner, Input, Label, Modal, Select } from "../../components/ui";
import { Difficulty, ExamBoard, GlobalSubject, QuestionType, SchoolStage } from "../../types";

interface RowState {
  type: QuestionType;
  text: string;
  topic: string;
  points: string;
  difficulty: Difficulty;
  year: string;
  correctText: string;
  options: { text: string; isCorrect: boolean }[];
}

function newRow(): RowState {
  return {
    type: "MULTIPLE_CHOICE",
    text: "",
    topic: "",
    points: "1",
    difficulty: "MEDIUM",
    year: "",
    correctText: "",
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ],
  };
}

function rowToPayload(row: RowState) {
  const payload: Record<string, unknown> = {
    type: row.type,
    text: row.text,
    topic: row.topic || undefined,
    points: Number(row.points),
    difficulty: row.difficulty,
    year: row.year ? Number(row.year) : undefined,
  };
  if (row.type === "MULTIPLE_CHOICE") payload.options = row.options;
  if (row.type === "TRUE_FALSE") {
    const trueIsCorrect = row.options[0]?.isCorrect ?? true;
    payload.options = [
      { text: "True", isCorrect: trueIsCorrect },
      { text: "False", isCorrect: !trueIsCorrect },
    ];
  }
  if (row.type === "FILL_IN_BLANK") payload.correctText = row.correctText;
  return payload;
}

export function BulkAddGlobalQuestionsModal({
  subjects,
  onClose,
  onSaved,
}: {
  subjects: GlobalSubject[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [globalSubjectId, setGlobalSubjectId] = useState("");
  const [examBoard, setExamBoard] = useState<ExamBoard>("WAEC");
  const [stage, setStage] = useState<SchoolStage>("SENIOR_SECONDARY");
  const [rows, setRows] = useState<RowState[]>([newRow()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateRow(index: number, patch: Partial<RowState>) {
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function updateRowOption(index: number, optIndex: number, field: "text" | "isCorrect", value: string | boolean) {
    setRows((rs) =>
      rs.map((r, i) => {
        if (i !== index) return r;
        const options = r.options.map((o, oi) => {
          if (oi === optIndex) return { ...o, [field]: value };
          if (field === "isCorrect" && value === true) return { ...o, isCorrect: false };
          return o;
        });
        return { ...r, options };
      })
    );
  }

  function addRowOption(index: number) {
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, options: [...r.options, { text: "", isCorrect: false }] } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  function removeRow(index: number) {
    setRows((rs) => rs.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await platformApi.post("/global-questions/bulk", {
        globalSubjectId,
        examBoard,
        stage,
        questions: rows.map(rowToPayload),
      });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Bulk add practice questions (${rows.length})`} onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500">
          Every question in this set shares the same subject, exam board and stage — build the whole set (e.g. one
          licensed past paper), then commit it in one go. Each question can still carry its own exam year.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Subject</Label>
            <Select required value={globalSubjectId} onChange={(e) => setGlobalSubjectId(e.target.value)}>
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
            <Select value={examBoard} onChange={(e) => setExamBoard(e.target.value as ExamBoard)}>
              <option value="WAEC">WAEC</option>
              <option value="NECO">NECO</option>
              <option value="UTME">UTME</option>
              <option value="GENERAL">General</option>
            </Select>
          </div>
          <div>
            <Label>Stage</Label>
            <Select value={stage} onChange={(e) => setStage(e.target.value as SchoolStage)}>
              <option value="SENIOR_SECONDARY">Senior secondary (SS1-SS3)</option>
              <option value="JUNIOR_SECONDARY">Junior secondary</option>
              <option value="PRIMARY">Primary</option>
            </Select>
          </div>
        </div>

        <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
          {rows.map((row, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Question {i + 1}</p>
                {rows.length > 1 && (
                  <Button type="button" variant="ghost" onClick={() => removeRow(i)}>
                    Remove
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Select value={row.type} onChange={(e) => updateRow(i, { type: e.target.value as QuestionType })}>
                  <option value="MULTIPLE_CHOICE">Multiple choice</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="FILL_IN_BLANK">Fill in the blank</option>
                  <option value="THEORY">Theory</option>
                </Select>

                <textarea
                  required
                  rows={2}
                  placeholder="Question text"
                  value={row.text}
                  onChange={(e) => updateRow(i, { text: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />

                {row.type === "MULTIPLE_CHOICE" && (
                  <div className="space-y-1">
                    {row.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${i}`}
                          checked={o.isCorrect}
                          onChange={() => updateRowOption(i, oi, "isCorrect", true)}
                        />
                        <Input
                          required
                          value={o.text}
                          onChange={(e) => updateRowOption(i, oi, "text", e.target.value)}
                          placeholder={`Option ${oi + 1}`}
                        />
                      </div>
                    ))}
                    <Button type="button" variant="secondary" onClick={() => addRowOption(i)}>
                      + Add option
                    </Button>
                  </div>
                )}

                {row.type === "TRUE_FALSE" && (
                  <Select
                    value={row.options[0]?.isCorrect ? "true" : "false"}
                    onChange={(e) => updateRow(i, { options: [{ text: "True", isCorrect: e.target.value === "true" }] })}
                  >
                    <option value="true">Correct answer: True</option>
                    <option value="false">Correct answer: False</option>
                  </Select>
                )}

                {row.type === "FILL_IN_BLANK" && (
                  <Input
                    required
                    placeholder="Correct answer"
                    value={row.correctText}
                    onChange={(e) => updateRow(i, { correctText: e.target.value })}
                  />
                )}

                <div className="grid grid-cols-4 gap-2">
                  <Input placeholder="Topic (optional)" value={row.topic} onChange={(e) => updateRow(i, { topic: e.target.value })} />
                  <Input type="number" min={1} placeholder="Points" value={row.points} onChange={(e) => updateRow(i, { points: e.target.value })} />
                  <Input
                    type="number"
                    min={1980}
                    max={2100}
                    placeholder="Year (optional)"
                    value={row.year}
                    onChange={(e) => updateRow(i, { year: e.target.value })}
                  />
                  <Select value={row.difficulty} onChange={(e) => updateRow(i, { difficulty: e.target.value as Difficulty })}>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="secondary" onClick={addRow} className="w-full">
          + Add another question
        </Button>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Committing..." : `Commit ${rows.length} question${rows.length === 1 ? "" : "s"}`}
        </Button>
      </form>
    </Modal>
  );
}
