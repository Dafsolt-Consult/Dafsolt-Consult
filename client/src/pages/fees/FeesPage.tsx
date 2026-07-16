import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, ErrorBanner, Input, Label, PageHeader, Select, Table } from "../../components/ui";
import { useClassArms, useSessions } from "../../hooks/useAcademics";
import { useFetch } from "../../hooks/useFetch";

interface FeeStructure {
  id: string;
  name: string;
  amount: number;
  session: { name: string };
  term: { name: string };
}

interface Invoice {
  id: string;
  amount: number;
  amountPaid: number;
  status: string;
  dueDate: string;
  student?: { user: { firstName: string; lastName: string } };
  feeStructure: { name: string };
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export function FeesPage() {
  const { user } = useAuth();
  const isStudentOrParent = user?.role === "STUDENT" || user?.role === "PARENT";

  return (
    <div>
      <PageHeader title="Fees" subtitle={isStudentOrParent ? "Your invoices" : "Manage fee structures, invoices and payments"} />
      {!isStudentOrParent && <FeeStructuresSection />}
      <InvoicesSection studentId={isStudentOrParent ? "me" : undefined} canManage={!isStudentOrParent} />
    </div>
  );
}

function FeeStructuresSection() {
  const { data: sessions } = useSessions();
  const { data: structures, refetch } = useFetch<FeeStructure[]>("/fees/structures");
  const [form, setForm] = useState({ name: "", amount: "", termId: "" });
  const [error, setError] = useState<string | null>(null);

  const currentSession = sessions?.find((s) => s.isCurrent) ?? sessions?.[0];

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/fees/structures", {
        name: form.name,
        amount: Math.round(Number(form.amount) * 100),
        sessionId: currentSession?.id,
        termId: form.termId,
      });
      setForm({ name: "", amount: "", termId: "" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card className="mb-6">
      <h3 className="mb-3 font-medium text-slate-800">Fee structures</h3>
      <div className="mb-4 flex flex-wrap gap-2">
        {structures?.map((s) => (
          <Badge key={s.id}>
            {s.name} — {naira(s.amount)} ({s.term.name})
          </Badge>
        ))}
        {!structures?.length && <span className="text-sm text-slate-500">No fee structures yet.</span>}
      </div>
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Input placeholder="Name e.g. Tuition" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input type="number" placeholder="Amount (₦)" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Select required value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })}>
          <option value="">Select term</option>
          {currentSession?.terms?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Button type="submit">Create</Button>
      </form>
    </Card>
  );
}

function InvoicesSection({ studentId, canManage }: { studentId?: string; canManage: boolean }) {
  const url = studentId ? `/fees/invoices?studentId=${studentId}` : "/fees/invoices";
  const { data: invoices, refetch } = useFetch<Invoice[]>(url);
  const [error, setError] = useState<string | null>(null);

  async function pay(invoiceId: string, amount: number) {
    setError(null);
    try {
      await api.post("/fees/payments", { invoiceId, amount, method: "CASH" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      <h3 className="mb-3 font-medium text-slate-800">Invoices</h3>
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      {!invoices?.length ? (
        <p className="text-sm text-slate-500">No invoices found.</p>
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              {!studentId && <th className="px-4 py-3">Student</th>}
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Status</th>
              {canManage && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <tr key={inv.id}>
                {!studentId && (
                  <td className="px-4 py-3">{inv.student ? `${inv.student.user.firstName} ${inv.student.user.lastName}` : "—"}</td>
                )}
                <td className="px-4 py-3">{inv.feeStructure.name}</td>
                <td className="px-4 py-3">{naira(inv.amount)}</td>
                <td className="px-4 py-3">{naira(inv.amountPaid)}</td>
                <td className="px-4 py-3">
                  <Badge tone={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "danger" : "warning"}>{inv.status}</Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    {inv.status !== "PAID" && (
                      <Button variant="secondary" onClick={() => pay(inv.id, inv.amount - inv.amountPaid)}>
                        Record full payment
                      </Button>
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
