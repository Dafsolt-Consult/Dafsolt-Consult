import { useMemo, useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { Button, Card, ErrorBanner, PageHeader, Select } from "../../components/ui";
import { useClassArms, useSessions } from "../../hooks/useAcademics";
import { useFetch } from "../../hooks/useFetch";
import { Paginated, Student } from "../../types";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
const STATUSES: Status[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

export function AttendancePage() {
  const { data: classArms } = useClassArms();
  const { data: sessions } = useSessions();
  const [classArmId, setClassArmId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<Record<string, Status>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sessionId = sessions?.find((s) => s.isCurrent)?.id ?? sessions?.[0]?.id;

  const { data: students, loading } = useFetch<Paginated<Student>>(
    classArmId && sessionId ? `/students?classArmId=${classArmId}&sessionId=${sessionId}&pageSize=100` : null,
    [classArmId, sessionId]
  );

  const list = useMemo(() => students?.items ?? [], [students]);

  function setStatus(studentId: string, status: Status) {
    setRecords((r) => ({ ...r, [studentId]: status }));
  }

  async function submit() {
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const payload = {
        classArmId,
        date,
        records: list.map((s) => ({ studentId: s.id, status: records[s.id] ?? "PRESENT" })),
      };
      await api.post("/attendance", payload);
      setSuccess(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Mark daily attendance for a class" />

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {success && <p className="mb-4 rounded-lg bg-brand-50 px-4 py-2 text-sm text-brand-800">Attendance saved.</p>}

      {!classArmId ? (
        <p className="text-sm text-slate-500">Choose a class to begin.</p>
      ) : loading ? (
        <p className="text-sm text-slate-500">Loading students...</p>
      ) : !list.length ? (
        <p className="text-sm text-slate-500">No students enrolled in this class for the current session.</p>
      ) : (
        <>
          <div className="space-y-2">
            {list.map((s) => (
              <Card key={s.id} className="flex items-center justify-between">
                <span className="font-medium text-slate-800">
                  {s.user.firstName} {s.user.lastName}
                </span>
                <div className="flex gap-2">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatus(s.id, status)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        (records[s.id] ?? "PRESENT") === status
                          ? "bg-brand-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          <Button onClick={submit} disabled={submitting} className="mt-4">
            {submitting ? "Saving..." : "Save attendance"}
          </Button>
        </>
      )}
    </div>
  );
}
