import { useState } from "react";
import { Badge, Card, EmptyState, ErrorBanner, PageHeader, Select, Spinner, Table } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { currentTermId, pickCurrentSession, useSessions } from "../../hooks/useAcademics";
import { Announcement, Assignment, CalendarEvent, Invoice, ReportCard, ResultEntry, Student } from "../../types";
import { ParentChildTimetable } from "../timetable/TimetablePage";
import { ParentChildElearning } from "../elearning/ElearningPage";
import { StudentRecords as DisciplinaryStudentRecords } from "../disciplinary/DisciplinaryPage";
import { StudentHealthView } from "../health/HealthPage";

const TABS = [
  "Performance",
  "Assignments",
  "E-Learning",
  "Conduct",
  "Health",
  "Exam Results",
  "Timetable",
  "School Calendar",
  "Fees",
  "Announcements",
] as const;

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export function ParentPage() {
  const { data: children, loading, error } = useFetch<Student[]>("/parents/me/children");
  const [childId, setChildId] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Performance");

  const activeChildId = childId ?? children?.[0]?.id ?? null;
  const activeChild = children?.find((c) => c.id === activeChildId);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!children?.length) {
    return (
      <div>
        <PageHeader title="Parent Portal" />
        <EmptyState message="No children are linked to your account yet. Contact the school office to have your child linked to this login." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Parent Portal"
        subtitle={activeChild ? `Viewing ${activeChild.user.firstName} ${activeChild.user.lastName}` : undefined}
        actions={
          children.length > 1 ? (
            <Select className="w-56" value={activeChildId ?? ""} onChange={(e) => setChildId(e.target.value)}>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.user.firstName} {c.user.lastName}
                </option>
              ))}
            </Select>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeChildId && (
        <>
          {tab === "Performance" && <PerformanceTab studentId={activeChildId} />}
          {tab === "Assignments" && <AssignmentsTab studentId={activeChildId} />}
          {tab === "E-Learning" && <ParentChildElearning studentId={activeChildId} />}
          {tab === "Conduct" && <DisciplinaryStudentRecords studentId={activeChildId} />}
          {tab === "Health" && <StudentHealthView studentId={activeChildId} />}
          {tab === "Exam Results" && <ExamResultsTab studentId={activeChildId} />}
          {tab === "Timetable" && <ParentChildTimetable studentId={activeChildId} />}
          {tab === "School Calendar" && <CalendarTab />}
          {tab === "Fees" && <FeesTab studentId={activeChildId} />}
          {tab === "Announcements" && <AnnouncementsTab />}
        </>
      )}
    </div>
  );
}

function PerformanceTab({ studentId }: { studentId: string }) {
  const { data: sessions } = useSessions();
  const currentSession = pickCurrentSession(sessions);
  const [termId, setTermId] = useState("");
  const activeTermId = termId || currentTermId(currentSession);

  const { data: results } = useFetch<ResultEntry[]>(
    activeTermId ? `/results/students/${studentId}?termId=${activeTermId}` : null,
    [studentId, activeTermId]
  );
  const { data: reportCard } = useFetch<{ reportCard: ReportCard | null }>(
    activeTermId ? `/results/report-cards/${studentId}/${activeTermId}` : null,
    [studentId, activeTermId]
  );
  const { data: attendanceSummary } = useFetch<{ status: string; _count: number }[]>(
    `/attendance/students/${studentId}/summary`,
    [studentId]
  );

  return (
    <div className="space-y-6">
      <Card className="max-w-xs">
        <label className="mb-1 block text-sm font-medium text-slate-700">Term</label>
        <Select value={activeTermId} onChange={(e) => setTermId(e.target.value)}>
          {(currentSession?.terms ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {attendanceSummary?.map((a) => (
          <Card key={a.status}>
            <p className="text-sm text-slate-500">{a.status}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{a._count}</p>
          </Card>
        ))}
        {reportCard?.reportCard?.position && (
          <Card>
            <p className="text-sm text-slate-500">Class position</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">#{reportCard.reportCard.position}</p>
          </Card>
        )}
      </div>

      <Card>
        <h3 className="mb-3 font-medium text-slate-800">Subject scores</h3>
        {!results?.length ? (
          <p className="text-sm text-slate-500">No results published yet for this term.</p>
        ) : (
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
        )}
      </Card>

      {reportCard?.reportCard && (reportCard.reportCard.classTeacherComment || reportCard.reportCard.principalComment) && (
        <Card>
          <h3 className="mb-3 font-medium text-slate-800">Teacher & principal feedback</h3>
          {reportCard.reportCard.classTeacherComment && (
            <p className="mb-2 text-sm text-slate-700">
              <span className="font-medium">Class teacher:</span> {reportCard.reportCard.classTeacherComment}
            </p>
          )}
          {reportCard.reportCard.principalComment && (
            <p className="text-sm text-slate-700">
              <span className="font-medium">Principal:</span> {reportCard.reportCard.principalComment}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function AssignmentsTab({ studentId }: { studentId: string }) {
  const { data: assignments, loading } = useFetch<Assignment[]>(`/assignments/students/${studentId}`, [studentId]);

  if (loading) return <Spinner />;
  if (!assignments?.length) return <EmptyState message="No assignments posted yet." />;

  return (
    <div className="space-y-3">
      {assignments.map((a) => (
        <Card key={a.id}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-slate-800">{a.title}</h3>
              <p className="text-sm text-slate-500">
                {a.subject?.name} · Due {new Date(a.dueDate).toLocaleDateString()} · {a.totalPoints} pts
              </p>
              {a.description && <p className="mt-2 text-sm text-slate-600">{a.description}</p>}
            </div>
            <div className="text-right">
              {a.mySubmission?.gradedAt ? (
                <Badge tone="success">
                  Graded: {a.mySubmission.score}/{a.totalPoints}
                </Badge>
              ) : a.mySubmission?.submittedAt ? (
                <Badge tone="warning">Submitted</Badge>
              ) : (
                <Badge tone="danger">Not submitted</Badge>
              )}
            </div>
          </div>
          {a.mySubmission?.feedback && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span className="font-medium">Feedback:</span> {a.mySubmission.feedback}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}

interface AttemptRow {
  id: string;
  status: string;
  totalScore: number;
  exam: { title: string; passMark: number; subject: { name: string } };
}

function ExamResultsTab({ studentId }: { studentId: string }) {
  const { data: attempts, loading } = useFetch<AttemptRow[]>(`/cbt/attempts/students/${studentId}`, [studentId]);

  if (loading) return <Spinner />;
  if (!attempts?.length) return <EmptyState message="No CBT exam attempts yet." />;

  return (
    <Table>
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
        <tr>
          <th className="px-4 py-3">Exam</th>
          <th className="px-4 py-3">Subject</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Score</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {attempts.map((a) => (
          <tr key={a.id}>
            <td className="px-4 py-3 font-medium text-slate-800">{a.exam.title}</td>
            <td className="px-4 py-3 text-slate-600">{a.exam.subject.name}</td>
            <td className="px-4 py-3">
              <Badge tone={a.status === "GRADED" ? "success" : "warning"}>{a.status}</Badge>
            </td>
            <td className="px-4 py-3 font-medium">{a.totalScore}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function CalendarTab() {
  const { data: events, loading } = useFetch<CalendarEvent[]>("/calendar");
  if (loading) return <Spinner />;
  if (!events?.length) return <EmptyState message="No upcoming school calendar events." />;

  return (
    <div className="space-y-2">
      {events.map((e) => (
        <Card key={e.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800">{e.title}</p>
            <p className="text-sm text-slate-500">
              {new Date(e.startDate).toLocaleDateString()}
              {e.endDate ? ` – ${new Date(e.endDate).toLocaleDateString()}` : ""}
            </p>
            {e.description && <p className="mt-1 text-sm text-slate-600">{e.description}</p>}
          </div>
          <Badge>{e.type}</Badge>
        </Card>
      ))}
    </div>
  );
}

function FeesTab({ studentId }: { studentId: string }) {
  const { data: invoices, loading } = useFetch<Invoice[]>(`/fees/invoices?studentId=${studentId}`, [studentId]);

  if (loading) return <Spinner />;
  if (!invoices?.length) return <EmptyState message="No invoices found for this term." />;

  return (
    <Table>
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
        <tr>
          <th className="px-4 py-3">Fee</th>
          <th className="px-4 py-3">Amount</th>
          <th className="px-4 py-3">Paid</th>
          <th className="px-4 py-3">Due date</th>
          <th className="px-4 py-3">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {invoices.map((inv) => (
          <tr key={inv.id}>
            <td className="px-4 py-3 font-medium text-slate-800">{inv.feeStructure.name}</td>
            <td className="px-4 py-3">{naira(inv.amount)}</td>
            <td className="px-4 py-3">{naira(inv.amountPaid)}</td>
            <td className="px-4 py-3">{new Date(inv.dueDate).toLocaleDateString()}</td>
            <td className="px-4 py-3">
              <Badge tone={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "danger" : "warning"}>{inv.status}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function AnnouncementsTab() {
  const { data: announcements, loading } = useFetch<Announcement[]>("/announcements");
  if (loading) return <Spinner />;
  if (!announcements?.length) return <EmptyState message="No announcements yet." />;

  return (
    <div className="space-y-3">
      {announcements.map((a) => (
        <Card key={a.id}>
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-slate-800">{a.title}</h3>
            <span className="text-xs text-slate-400">{new Date(a.publishedAt).toLocaleDateString()}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
          {a.createdBy && (
            <p className="mt-2 text-xs text-slate-400">
              — {a.createdBy.firstName} {a.createdBy.lastName}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
