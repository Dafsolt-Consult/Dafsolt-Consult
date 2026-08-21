import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, ErrorBanner, Input, Label, PageHeader, Select, Table } from "../../components/ui";
import { pickCurrentSession, useClassArms, useSessions } from "../../hooks/useAcademics";
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
  discountAmount: number;
  amountPaid: number;
  status: string;
  dueDate: string;
  student?: { user: { firstName: string; lastName: string } };
  feeStructure: { name: string };
}

interface Scholarship {
  id: string;
  studentId: string;
  name: string;
  discountType: "PERCENT" | "FIXED";
  amount: number;
  reason?: string | null;
  isActive: boolean;
  student?: { user: { firstName: string; lastName: string } };
}

interface StudentOption {
  id: string;
  admissionNumber: string;
  user: { firstName: string; lastName: string };
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export function FeesPage() {
  const { user } = useAuth();
  const isStudentOrParent = user?.role === "STUDENT" || user?.role === "PARENT";
  const { data: structures, refetch: refetchStructures } = useFetch<FeeStructure[]>(
    isStudentOrParent ? null : "/fees/structures"
  );
  const [invoicesVersion, setInvoicesVersion] = useState(0);

  return (
    <div>
      <PageHeader title="Fees" subtitle={isStudentOrParent ? "Your invoices" : "Manage fee structures, invoices and payments"} />
      {!isStudentOrParent && <FeeStructuresSection structures={structures} refetch={refetchStructures} />}
      {!isStudentOrParent && (
        <GenerateInvoicesSection structures={structures} onGenerated={() => setInvoicesVersion((v) => v + 1)} />
      )}
      {!isStudentOrParent && <ScholarshipsSection />}
      <InvoicesSection
        studentId={isStudentOrParent ? "me" : undefined}
        canManage={!isStudentOrParent}
        refreshKey={invoicesVersion}
      />
    </div>
  );
}

function FeeStructuresSection({
  structures,
  refetch,
}: {
  structures: FeeStructure[] | null;
  refetch: () => void;
}) {
  const { data: sessions } = useSessions();
  const [form, setForm] = useState({ name: "", amount: "", termId: "" });
  const [error, setError] = useState<string | null>(null);

  const currentSession = pickCurrentSession(sessions);

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
        <div>
          <Label>Name</Label>
          <Input placeholder="e.g. Tuition" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Amount (₦)</Label>
          <Input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div>
          <Label>Term</Label>
          <Select required value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })}>
            <option value="">Select term</option>
            {currentSession?.terms?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            Create
          </Button>
        </div>
      </form>
    </Card>
  );
}

function GenerateInvoicesSection({
  structures,
  onGenerated,
}: {
  structures: FeeStructure[] | null;
  onGenerated: () => void;
}) {
  const { data: classArms } = useClassArms();
  const [feeStructureId, setFeeStructureId] = useState("");
  const [classArmId, setClassArmId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function generate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const { data } = await api.post<{ generated: number }>("/fees/invoices/generate", {
        feeStructureId,
        classArmId,
        dueDate,
      });
      setResult(`${data.generated} invoice(s) generated for the class.`);
      onGenerated();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mb-6">
      <h3 className="mb-3 font-medium text-slate-800">Generate invoices</h3>
      <p className="mb-3 text-sm text-slate-500">
        Bill an entire class against a fee structure. Students who already have an invoice for it are skipped.
      </p>
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      {result && <div className="mb-3 text-sm text-emerald-600">{result}</div>}
      <form onSubmit={generate} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <Label>Fee structure</Label>
          <Select required value={feeStructureId} onChange={(e) => setFeeStructureId(e.target.value)}>
            <option value="">Select</option>
            {structures?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {naira(s.amount)} ({s.term.name})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Class</Label>
          <Select required value={classArmId} onChange={(e) => setClassArmId(e.target.value)}>
            <option value="">Select</option>
            {classArms?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.classLevel?.name ? `${c.classLevel.name} ${c.name}` : c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Due date</Label>
          <Input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Generating..." : "Generate"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ScholarshipsSection() {
  const { data: scholarships, refetch } = useFetch<Scholarship[]>("/scholarships");
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [form, setForm] = useState({ name: "", discountType: "PERCENT", amount: "", reason: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function runSearch(value: string) {
    setSearch(value);
    setSelectedStudent(null);
    if (!value) {
      setOptions([]);
      return;
    }
    const { data } = await api.get<{ items: StudentOption[] }>(`/students?search=${encodeURIComponent(value)}`);
    setOptions(data.items);
  }

  async function grant(e: FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/scholarships", {
        studentId: selectedStudent.id,
        name: form.name,
        discountType: form.discountType,
        amount: form.discountType === "FIXED" ? Math.round(Number(form.amount) * 100) : Number(form.amount),
        reason: form.reason || undefined,
      });
      setForm({ name: "", discountType: "PERCENT", amount: "", reason: "" });
      setSelectedStudent(null);
      setSearch("");
      setOptions([]);
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(s: Scholarship) {
    await api.patch(`/scholarships/${s.id}`, { isActive: !s.isActive });
    refetch();
  }

  return (
    <Card className="mb-6">
      <h3 className="mb-3 font-medium text-slate-800">Scholarships & discounts</h3>

      <div className="mb-4 flex flex-wrap gap-2">
        {scholarships?.map((s) => (
          <Badge key={s.id} tone={s.isActive ? "success" : "default"}>
            {s.student ? `${s.student.user.firstName} ${s.student.user.lastName}` : "—"} · {s.name} ·{" "}
            {s.discountType === "PERCENT" ? `${s.amount}%` : naira(s.amount)}
            <button className="ml-2 underline" onClick={() => toggleActive(s)}>
              {s.isActive ? "deactivate" : "reactivate"}
            </button>
          </Badge>
        ))}
        {!scholarships?.length && <span className="text-sm text-slate-500">No scholarships granted yet.</span>}
      </div>

      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}

      <form onSubmit={grant} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        <div className="relative sm:col-span-2">
          <Label>Student</Label>
          <Input
            placeholder="Search by name..."
            value={selectedStudent ? `${selectedStudent.user.firstName} ${selectedStudent.user.lastName}` : search}
            onChange={(e) => runSearch(e.target.value)}
          />
          {options.length > 0 && !selectedStudent && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
              {options.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setSelectedStudent(o);
                    setOptions([]);
                  }}
                >
                  {o.user.firstName} {o.user.lastName} ({o.admissionNumber})
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <Label>Name</Label>
          <Input placeholder="e.g. Merit award" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Discount type</Label>
          <Select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
            <option value="PERCENT">% off</option>
            <option value="FIXED">₦ off</option>
          </Select>
        </div>
        <div>
          <Label>{form.discountType === "PERCENT" ? "Percent off" : "Amount (₦)"}</Label>
          <Input
            type="number"
            min={1}
            placeholder={form.discountType === "PERCENT" ? "e.g. 50" : "e.g. 5000"}
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={!selectedStudent || submitting} className="self-end sm:col-span-5">
          {submitting ? "Granting..." : "Grant scholarship"}
        </Button>
      </form>
    </Card>
  );
}

function InvoicesSection({
  studentId,
  canManage,
  refreshKey,
}: {
  studentId?: string;
  canManage: boolean;
  refreshKey: number;
}) {
  const url = studentId ? `/fees/invoices?studentId=${studentId}` : "/fees/invoices";
  const { data: invoices, refetch } = useFetch<Invoice[]>(url, [refreshKey]);
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
                <td className="px-4 py-3">
                  {naira(inv.amount)}
                  {inv.discountAmount > 0 && <span className="ml-1 text-xs text-emerald-600">(-{naira(inv.discountAmount)})</span>}
                </td>
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
