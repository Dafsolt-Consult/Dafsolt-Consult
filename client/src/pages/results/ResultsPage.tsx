import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, ErrorBanner, Input, PageHeader, Select, Table } from "../../components/ui";
import { currentSessionId, pickCurrentSession, useClassArms, useSessions, useSubjects } from "../../hooks/useAcademics";
import { useFetch } from "../../hooks/useFetch";
import { Paginated, Student } from "../../types";

interface ResultRow {
  id: string;
  studentId: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade?: string | null;
}

export function ResultsPage() {
  const { user } = useAuth();
  if (user?.role === "STUDENT" || user?.role === "PARENT") return <MyResultsView />;
  return <StaffResultsView />;
}

function StaffResultsView() {
  const { user } = useAuth();
  const { data: classArms } = useClassArms();
  const { data: subjects } = useSubjects();
  const { data: sessions } = useSessions();
  const [classArmId, setClassArmId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, { ca: string; exam: string }>>({});
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  const sessionId = currentSessionId(sessions);
  const termId = sessions?.find((s) => s.id === sessionId)?.terms?.find((t) => t.isCurrent)?.id ?? "";

  const { data: students } = useFetch<Paginated<Student>>(
    classArmId && sessionId ? `/students?classArmId=${classArmId}&sessionId=${sessionId}&pageSize=100` : null,
    [classArmId, sessionId]
  );
  const { data: existingResults, refetch } = useFetch<ResultRow[]>(
    classArmId && subjectId && termId ? `/results?classArmId=${classArmId}&subjectId=${subjectId}&termId=${termId}` : null,
    [classArmId, subjectId, termId]
  );

  function scoreFor(studentId: string, field: "ca" | "exam") {
    const existing = existingResults?.find((r) => r.studentId === studentId);
    const draft = scores[studentId];
    if (draft?.[field] !== undefined) return draft[field];
    if (!existing) return "";
    return String(field === "ca" ? existing.caScore : existing.examScore);
  }

  function update(studentId: string, field: "ca" | "exam", value: string) {
    setScores((s) => {
      const base = s[studentId] ?? { ca: scoreFor(studentId, "ca"), exam: scoreFor(studentId, "exam") };
      return { ...s, [studentId]: { ...base, [field]: value } };
    });
  }

  async function save(studentId: string) {
    setError(null);
    try {
      await api.post("/results", {
        studentId,
        classArmId,
        subjectId,
        sessionId,
        termId,
        caScore: Number(scoreFor(studentId, "ca") || 0),
        examScore: Number(scoreFor(studentId, "exam") || 0),
      });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function generateReportCards() {
    setError(null);
    setGenerateMessage(null);
    setGenerating(true);
    try {
      const res = await api.post<{ generated: number }>("/results/report-cards/generate", { classArmId, sessionId, termId });
      setGenerateMessage(`Generated ${res.data.generated} report card${res.data.generated === 1 ? "" : "s"} and notified students/guardians.`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Results"
        subtitle="Enter continuous assessment and exam scores"
        actions={
          user?.role === "SCHOOL_ADMIN" && classArmId && termId ? (
            <Button onClick={generateReportCards} disabled={generating}>
              {generating ? "Generating..." : "Generate report cards"}
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Class</label>
            <Select value={classArmId} onChange={(e) => setClassArmId(e.target.value)}>
              <option value="">Select class</option>
              {classArms?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.classLevel?.name} {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Select subject</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {generateMessage && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{generateMessage}</p>}

      {classArmId && subjectId && students?.items.length ? (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">CA (40)</th>
              <th className="px-4 py-3">Exam (60)</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.items.map((s) => {
              const existing = existingResults?.find((r) => r.studentId === s.id);
              return (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {s.user.firstName} {s.user.lastName}
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min={0}
                      max={40}
                      className="w-20"
                      value={scoreFor(s.id, "ca")}
                      onChange={(e) => update(s.id, "ca", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      className="w-20"
                      value={scoreFor(s.id, "exam")}
                      onChange={(e) => update(s.id, "exam", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{existing?.totalScore ?? "—"}</td>
                  <td className="px-4 py-3">{existing?.grade && <Badge tone="success">{existing.grade}</Badge>}</td>
                  <td className="px-4 py-3">
                    <Button variant="secondary" onClick={() => save(s.id)}>
                      Save
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <p className="text-sm text-slate-500">Choose a class and subject to enter results.</p>
      )}
    </div>
  );
}

function MyResultsView() {
  const [termId, setTermId] = useState("");
  const { data: sessions } = useSessions();
  const currentSession = pickCurrentSession(sessions);

  const { data: results } = useFetch<{ id: string; subject: { name: string }; caScore: number; examScore: number; totalScore: number; grade?: string | null }[]>(
    termId ? `/results/students/me?termId=${termId}` : null,
    [termId]
  );

  return (
    <div>
      <PageHeader title="My Results" />
      <Card className="mb-6 max-w-xs">
        <label className="mb-1 block text-sm font-medium text-slate-700">Term</label>
        <Select value={termId} onChange={(e) => setTermId(e.target.value)}>
          <option value="">Select term</option>
          {(currentSession?.terms ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Card>
      {results?.length ? (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">CA</th>
              <th className="px-4 py-3">Exam</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{r.subject.name}</td>
                <td className="px-4 py-3">{r.caScore}</td>
                <td className="px-4 py-3">{r.examScore}</td>
                <td className="px-4 py-3 font-medium">{r.totalScore}</td>
                <td className="px-4 py-3">{r.grade && <Badge tone="success">{r.grade}</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-sm text-slate-500">No results published yet for this term.</p>
      )}
    </div>
  );
}
