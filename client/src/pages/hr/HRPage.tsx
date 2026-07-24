import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Label, PageHeader, Select, Spinner, Table } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";

type Tab = "attendance" | "leave" | "payroll" | "performance";

interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  baseSalary?: number | null;
}

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user: { firstName: string; lastName: string };
}

interface PayrollRun {
  id: string;
  periodMonth: number;
  periodYear: number;
  status: "DRAFT" | "FINALIZED" | "PAID";
  _count?: { payslips: number };
}

interface Payslip {
  id: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  paidAt?: string | null;
  user: StaffUser;
}

interface PerformanceReview {
  id: string;
  period: string;
  rating: string;
  comments?: string | null;
  user: { firstName: string; lastName: string };
  reviewer: { firstName: string; lastName: string };
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function HRPage() {
  const { user } = useAuth();
  const isManager = user?.role === "SCHOOL_ADMIN" || user?.role === "HR_MANAGER";
  if (!isManager) return <MyHRView />;

  const [tab, setTab] = useState<Tab>("attendance");
  const tabs: { id: Tab; label: string }[] = [
    { id: "attendance", label: "Attendance" },
    { id: "leave", label: "Leave requests" },
    { id: "payroll", label: "Payroll" },
    { id: "performance", label: "Performance" },
  ];

  return (
    <div>
      <PageHeader title="HR & Payroll" subtitle="Staff attendance, leave, payroll and performance reviews" />
      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {tabs.map((t) => (
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
      {tab === "leave" && <LeaveTab isManager />}
      {tab === "payroll" && <PayrollTab />}
      {tab === "performance" && <PerformanceTab />}
    </div>
  );
}

function AttendanceTab() {
  const { data: staff } = useFetch<StaffUser[]>("/users");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: records, refetch } = useFetch<{ user: { id: string }; status: string }[]>(`/hr/attendance?from=${date}&to=${date}`, [
    date,
  ]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function mark(userId: string) {
    setError(null);
    try {
      await api.post("/hr/attendance", { userId, date, status: drafts[userId] ?? "PRESENT" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      <div className="mb-4 max-w-xs">
        <Label>Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {error && <ErrorBanner message={error} />}
      {!staff?.length ? (
        <EmptyState message="No staff on file." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Today's status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((s) => {
              const existing = records?.find((r) => r.user.id === s.id);
              return (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.role.replace("_", " ")}</td>
                  <td className="px-4 py-3">{existing ? <Badge tone="success">{existing.status}</Badge> : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Select
                        className="w-32"
                        value={drafts[s.id] ?? "PRESENT"}
                        onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                      >
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LATE">Late</option>
                        <option value="ON_LEAVE">On leave</option>
                      </Select>
                      <Button variant="secondary" onClick={() => mark(s.id)}>
                        Mark
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

function LeaveTab({ isManager }: { isManager: boolean }) {
  const { data: requests, refetch } = useFetch<LeaveRequest[]>("/hr/leave-requests");
  const [error, setError] = useState<string | null>(null);

  async function review(id: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    try {
      await api.patch(`/hr/leave-requests/${id}`, { status });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      {error && <ErrorBanner message={error} />}
      {!requests?.length ? (
        <EmptyState message="No leave requests." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              {isManager && <th className="px-4 py-3">Staff</th>}
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              {isManager && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r) => (
              <tr key={r.id}>
                {isManager && (
                  <td className="px-4 py-3">
                    {r.user.firstName} {r.user.lastName}
                  </td>
                )}
                <td className="px-4 py-3 text-slate-600">{r.type}</td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.reason ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>{r.status}</Badge>
                </td>
                {isManager && (
                  <td className="px-4 py-3">
                    {r.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => review(r.id, "APPROVED")}>
                          Approve
                        </Button>
                        <Button variant="ghost" onClick={() => review(r.id, "REJECTED")}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

function PayrollTab() {
  const { data: runs, refetch: refetchRuns } = useFetch<PayrollRun[]>("/hr/payroll/runs");
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const now = new Date();
  const [form, setForm] = useState({ periodMonth: String(now.getMonth() + 1), periodYear: String(now.getFullYear()) });
  const [error, setError] = useState<string | null>(null);

  async function createRun(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/hr/payroll/runs", { periodMonth: Number(form.periodMonth), periodYear: Number(form.periodYear) });
      refetchRuns();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (selectedRun) {
    return <PayrollRunDetail run={selectedRun} onBack={() => setSelectedRun(null)} onChanged={refetchRuns} />;
  }

  return (
    <Card>
      {error && <ErrorBanner message={error} />}
      {!runs?.length ? (
        <p className="mb-4 text-sm text-slate-500">No payroll runs yet.</p>
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Payslips</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {MONTHS[r.periodMonth - 1]} {r.periodYear}
                </td>
                <td className="px-4 py-3 text-slate-600">{r._count?.payslips ?? 0}</td>
                <td className="px-4 py-3">
                  <Badge tone={r.status === "PAID" ? "success" : r.status === "FINALIZED" ? "warning" : "default"}>{r.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Button variant="secondary" onClick={() => setSelectedRun(r)}>
                    Manage
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <form onSubmit={createRun} className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
        <Select value={form.periodMonth} onChange={(e) => setForm({ ...form, periodMonth: e.target.value })}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </Select>
        <Input type="number" value={form.periodYear} onChange={(e) => setForm({ ...form, periodYear: e.target.value })} />
        <Button type="submit">+ New payroll run</Button>
      </form>
    </Card>
  );
}

function PayrollRunDetail({ run, onBack, onChanged }: { run: PayrollRun; onBack: () => void; onChanged: () => void }) {
  const { data: staff } = useFetch<StaffUser[]>("/users");
  const { data: payslips, refetch } = useFetch<Payslip[]>(`/hr/payroll/runs/${run.id}/payslips`);
  const [drafts, setDrafts] = useState<Record<string, { basicSalary: string; allowances: string; deductions: string }>>({});
  const [error, setError] = useState<string | null>(null);

  function draftFor(s: StaffUser) {
    const existing = payslips?.find((p) => p.user.id === s.id);
    return (
      drafts[s.id] ?? {
        basicSalary: existing ? String(existing.basicSalary / 100) : s.baseSalary ? String(s.baseSalary / 100) : "",
        allowances: existing ? String(existing.allowances / 100) : "0",
        deductions: existing ? String(existing.deductions / 100) : "0",
      }
    );
  }

  async function save(s: StaffUser) {
    const d = draftFor(s);
    setError(null);
    try {
      await api.post(`/hr/payroll/runs/${run.id}/payslips`, {
        userId: s.id,
        basicSalary: Math.round(Number(d.basicSalary || 0) * 100),
        allowances: Math.round(Number(d.allowances || 0) * 100),
        deductions: Math.round(Number(d.deductions || 0) * 100),
      });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function finalize() {
    if (!confirm("Finalize this payroll run? Payslips can no longer be edited afterwards.")) return;
    await api.post(`/hr/payroll/runs/${run.id}/finalize`, {});
    onChanged();
    onBack();
  }

  async function markPaid(payslipId: string) {
    await api.post(`/hr/payroll/payslips/${payslipId}/pay`, {});
    refetch();
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <button className="text-sm text-brand-700 hover:underline" onClick={onBack}>
            ← All runs
          </button>
          <h3 className="mt-1 font-medium text-slate-800">
            {MONTHS[run.periodMonth - 1]} {run.periodYear} · <Badge>{run.status}</Badge>
          </h3>
        </div>
        {run.status === "DRAFT" && <Button onClick={finalize}>Finalize run</Button>}
      </div>

      {error && <ErrorBanner message={error} />}

      <Table>
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Staff</th>
            <th className="px-4 py-3">Basic</th>
            <th className="px-4 py-3">Allowances</th>
            <th className="px-4 py-3">Deductions</th>
            <th className="px-4 py-3">Net</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {staff?.map((s) => {
            const d = draftFor(s);
            const existing = payslips?.find((p) => p.user.id === s.id);
            return (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  {s.firstName} {s.lastName}
                </td>
                {run.status === "DRAFT" ? (
                  <>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        className="w-24"
                        value={d.basicSalary}
                        onChange={(e) => setDrafts((cur) => ({ ...cur, [s.id]: { ...d, basicSalary: e.target.value } }))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        className="w-20"
                        value={d.allowances}
                        onChange={(e) => setDrafts((cur) => ({ ...cur, [s.id]: { ...d, allowances: e.target.value } }))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        className="w-20"
                        value={d.deductions}
                        onChange={(e) => setDrafts((cur) => ({ ...cur, [s.id]: { ...d, deductions: e.target.value } }))}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {naira(
                        Math.round((Number(d.basicSalary || 0) + Number(d.allowances || 0) - Number(d.deductions || 0)) * 100)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="secondary" onClick={() => save(s)}>
                        Save
                      </Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">{existing ? naira(existing.basicSalary) : "—"}</td>
                    <td className="px-4 py-3">{existing ? naira(existing.allowances) : "—"}</td>
                    <td className="px-4 py-3">{existing ? naira(existing.deductions) : "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{existing ? naira(existing.netPay) : "—"}</td>
                    <td className="px-4 py-3">
                      {existing &&
                        (existing.paidAt ? (
                          <Badge tone="success">Paid</Badge>
                        ) : (
                          <Button variant="secondary" onClick={() => markPaid(existing.id)}>
                            Mark paid
                          </Button>
                        ))}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}

function PerformanceTab() {
  const { data: staff } = useFetch<StaffUser[]>("/users");
  const { data: reviews, refetch } = useFetch<PerformanceReview[]>("/hr/performance-reviews");
  const [form, setForm] = useState({ userId: "", period: "", rating: "GOOD", comments: "" });
  const [error, setError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/hr/performance-reviews", { ...form, comments: form.comments || undefined });
      setForm({ userId: "", period: "", rating: "GOOD", comments: "" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      {error && <ErrorBanner message={error} />}
      {!reviews?.length ? (
        <p className="mb-4 text-sm text-slate-500">No performance reviews yet.</p>
      ) : (
        <div className="mb-4 space-y-2">
          {reviews.map((r) => (
            <Card key={r.id} className="p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-800">
                  {r.user.firstName} {r.user.lastName} · {r.period}
                </p>
                <Badge tone={r.rating === "EXCELLENT" || r.rating === "VERY_GOOD" ? "success" : r.rating === "POOR" ? "danger" : "default"}>
                  {r.rating.replace("_", " ")}
                </Badge>
              </div>
              {r.comments && <p className="mt-1 text-sm text-slate-600">{r.comments}</p>}
              <p className="mt-1 text-xs text-slate-400">
                Reviewed by {r.reviewer.firstName} {r.reviewer.lastName}
              </p>
            </Card>
          ))}
        </div>
      )}
      <form onSubmit={create} className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <Select required value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
          <option value="">Select staff</option>
          {staff?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName}
            </option>
          ))}
        </Select>
        <Input placeholder="Period e.g. 2026 H1" required value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
        <Select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
          <option value="EXCELLENT">Excellent</option>
          <option value="VERY_GOOD">Very good</option>
          <option value="GOOD">Good</option>
          <option value="FAIR">Fair</option>
          <option value="POOR">Poor</option>
        </Select>
        <Button type="submit">+ Add review</Button>
        <textarea
          className="sm:col-span-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          rows={2}
          placeholder="Comments (optional)"
          value={form.comments}
          onChange={(e) => setForm({ ...form, comments: e.target.value })}
        />
      </form>
    </Card>
  );
}

function MyHRView() {
  const [tab, setTab] = useState<"leave" | "payslips" | "performance">("leave");
  const tabs = [
    { id: "leave" as const, label: "Leave" },
    { id: "payslips" as const, label: "Payslips" },
    { id: "performance" as const, label: "Performance" },
  ];

  return (
    <div>
      <PageHeader title="My HR" subtitle="Leave requests, payslips and performance reviews" />
      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {tabs.map((t) => (
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
      {tab === "leave" && <MyLeaveView />}
      {tab === "payslips" && <MyPayslipsView />}
      {tab === "performance" && <LeaveTab isManager={false} />}
    </div>
  );
}

function MyLeaveView() {
  const { data: requests, refetch } = useFetch<LeaveRequest[]>("/hr/leave-requests");
  const [form, setForm] = useState({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/hr/leave-requests", { ...form, reason: form.reason || undefined });
      setForm({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      {error && <ErrorBanner message={error} />}
      {!requests?.length ? (
        <p className="mb-4 text-sm text-slate-500">No leave requests yet.</p>
      ) : (
        <div className="mb-4 space-y-2">
          {requests.map((r) => (
            <Card key={r.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{r.type}</p>
                <p className="text-xs text-slate-500">
                  {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                </p>
              </div>
              <Badge tone={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>{r.status}</Badge>
            </Card>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="ANNUAL">Annual</option>
          <option value="SICK">Sick</option>
          <option value="MATERNITY">Maternity</option>
          <option value="PATERNITY">Paternity</option>
          <option value="UNPAID">Unpaid</option>
          <option value="OTHER">Other</option>
        </Select>
        <Input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <Input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        <Button type="submit">+ Request leave</Button>
        <Input
          className="sm:col-span-4"
          placeholder="Reason (optional)"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
      </form>
    </Card>
  );
}

function MyPayslipsView() {
  const { data: payslips, loading, error } = useFetch<(Payslip & { payrollRun: PayrollRun })[]>("/hr/payroll/my-payslips");

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!payslips?.length) return <EmptyState message="No payslips yet." />;

  return (
    <Card>
      <Table>
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Basic</th>
            <th className="px-4 py-3">Allowances</th>
            <th className="px-4 py-3">Deductions</th>
            <th className="px-4 py-3">Net</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payslips.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3">
                {MONTHS[p.payrollRun.periodMonth - 1]} {p.payrollRun.periodYear}
              </td>
              <td className="px-4 py-3">{naira(p.basicSalary)}</td>
              <td className="px-4 py-3">{naira(p.allowances)}</td>
              <td className="px-4 py-3">{naira(p.deductions)}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{naira(p.netPay)}</td>
              <td className="px-4 py-3">
                <Badge tone={p.paidAt ? "success" : "warning"}>{p.paidAt ? "Paid" : "Pending"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
