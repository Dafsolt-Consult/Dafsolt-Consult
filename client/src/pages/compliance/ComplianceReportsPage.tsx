import { useState } from "react";
import { Badge, Card, EmptyState, ErrorBanner, Input, PageHeader, Select, Spinner, Table } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { pickCurrentSession, useSessions } from "../../hooks/useAcademics";

type Tab = "attendance" | "fees" | "audit" | "completeness";

const TABS: { id: Tab; label: string }[] = [
  { id: "attendance", label: "Attendance" },
  { id: "fees", label: "Fee collection" },
  { id: "audit", label: "Audit log" },
  { id: "completeness", label: "Data completeness" },
];

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export function ComplianceReportsPage() {
  const [tab, setTab] = useState<Tab>("attendance");

  return (
    <div>
      <PageHeader title="Compliance Reports" subtitle="Attendance, fee collection, audit trail and data hygiene" />

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === t.id ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "attendance" && <AttendanceTab />}
      {tab === "fees" && <FeesTab />}
      {tab === "audit" && <AuditLogTab />}
      {tab === "completeness" && <CompletenessTab />}
    </div>
  );
}

interface AttendanceRow {
  studentId: string;
  studentName: string;
  totalDays: number;
  presentDays: number;
  attendanceRate: number;
}

function AttendanceTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [threshold, setThreshold] = useState("75");

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (threshold) params.set("threshold", threshold);

  const { data, loading, error } = useFetch<AttendanceRow[]>(`/compliance/attendance?${params}`, [from, to, threshold]);

  return (
    <Card>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Below threshold (%)</label>
          <Input type="number" min={0} max={100} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !data?.length ? (
        <EmptyState message="No students below this attendance threshold for the selected range." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Present / Total days</th>
              <th className="px-4 py-3">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((r) => (
              <tr key={r.studentId}>
                <td className="px-4 py-3 font-medium text-slate-800">{r.studentName}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.presentDays} / {r.totalDays}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={r.attendanceRate < 50 ? "danger" : "warning"}>{r.attendanceRate}%</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

interface FeeComplianceSummary {
  totalBilled: number;
  totalPaid: number;
  collectionRate: number;
  invoiceCount: number;
  outstanding: {
    invoiceId: string;
    studentName: string;
    feeStructureName: string;
    balance: number;
    status: string;
    dueDate: string;
  }[];
}

function FeesTab() {
  const { data: sessions } = useSessions();
  const currentSession = pickCurrentSession(sessions);
  const [termId, setTermId] = useState("");
  const effectiveTermId = termId || currentSession?.terms?.find((t) => t.isCurrent)?.id || "";

  const { data, loading, error } = useFetch<FeeComplianceSummary>(
    effectiveTermId ? `/compliance/fees?termId=${effectiveTermId}` : null,
    [effectiveTermId]
  );

  return (
    <div>
      <div className="mb-4 max-w-xs">
        <Select value={effectiveTermId} onChange={(e) => setTermId(e.target.value)}>
          {currentSession?.terms?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : data ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Card>
              <p className="text-xs text-slate-500">Total billed</p>
              <p className="text-lg font-semibold text-slate-800">{naira(data.totalBilled)}</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Total collected</p>
              <p className="text-lg font-semibold text-slate-800">{naira(data.totalPaid)}</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Collection rate</p>
              <p className="text-lg font-semibold text-slate-800">{data.collectionRate}%</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Invoices</p>
              <p className="text-lg font-semibold text-slate-800">{data.invoiceCount}</p>
            </Card>
          </div>

          <Card>
            <h3 className="mb-3 font-medium text-slate-800">Outstanding balances</h3>
            {!data.outstanding.length ? (
              <p className="text-sm text-slate-500">Nothing outstanding for this term.</p>
            ) : (
              <Table>
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Fee</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.outstanding.map((o) => (
                    <tr key={o.invoiceId}>
                      <td className="px-4 py-3">{o.studentName}</td>
                      <td className="px-4 py-3 text-slate-600">{o.feeStructureName}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{naira(o.balance)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={o.status === "OVERDUE" ? "danger" : "warning"}>{o.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{new Date(o.dueDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string } | null;
}

function AuditLogTab() {
  const [page, setPage] = useState(1);
  const { data, loading, error } = useFetch<{ items: AuditLogEntry[]; total: number; pageSize: number }>(
    `/compliance/audit-log?page=${page}`,
    [page]
  );

  return (
    <Card>
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !data?.items.length ? (
        <EmptyState message="No audit log entries yet." />
      ) : (
        <>
          <Table>
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-slate-600">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{log.user ? `${log.user.firstName} ${log.user.lastName}` : "System"}</td>
                  <td className="px-4 py-3">
                    <Badge>{log.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {log.entityType}
                    {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{log.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
            <span>
              Page {page} · {data.total} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

interface DataCompleteness {
  studentsWithoutGuardians: { id: string; name: string; admissionNumber: string }[];
  teachersWithoutQualification: { id: string; name: string; staffId: string }[];
  classArmsWithoutFormTeacher: { id: string; name: string }[];
}

function CompletenessTab() {
  const { data, loading, error } = useFetch<DataCompleteness>("/compliance/data-completeness");

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <h3 className="mb-3 font-medium text-slate-800">Students without a guardian ({data.studentsWithoutGuardians.length})</h3>
        {!data.studentsWithoutGuardians.length ? (
          <p className="text-sm text-slate-500">All active students have a guardian on file.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-600">
            {data.studentsWithoutGuardians.map((s) => (
              <li key={s.id}>
                {s.name} ({s.admissionNumber})
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h3 className="mb-3 font-medium text-slate-800">
          Teachers without a qualification on file ({data.teachersWithoutQualification.length})
        </h3>
        {!data.teachersWithoutQualification.length ? (
          <p className="text-sm text-slate-500">All teachers have qualifications on file.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-600">
            {data.teachersWithoutQualification.map((t) => (
              <li key={t.id}>
                {t.name} ({t.staffId})
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h3 className="mb-3 font-medium text-slate-800">Classes without a form teacher ({data.classArmsWithoutFormTeacher.length})</h3>
        {!data.classArmsWithoutFormTeacher.length ? (
          <p className="text-sm text-slate-500">Every class has a form teacher assigned.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-600">
            {data.classArmsWithoutFormTeacher.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
