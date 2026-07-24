import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Label, PageHeader, Select, Spinner, Table } from "../../components/ui";
import { useClassArms, useSessions } from "../../hooks/useAcademics";
import { useFetch } from "../../hooks/useFetch";
import { PromotionCandidate } from "../../types";

export function PromotionsPage() {
  const { user } = useAuth();
  if (user?.role !== "SCHOOL_ADMIN") {
    return <p className="text-sm text-slate-500">Only a school admin can promote students.</p>;
  }
  return <PromotionsView />;
}

function PromotionsView() {
  const { data: classArms } = useClassArms();
  const { data: sessions } = useSessions();

  const [fromClassArmId, setFromClassArmId] = useState("");
  const [fromSessionId, setFromSessionId] = useState("");
  const [toClassArmId, setToClassArmId] = useState("");
  const [toSessionId, setToSessionId] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [promoting, setPromoting] = useState(false);
  const [result, setResult] = useState<{ promoted: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query =
    fromClassArmId && fromSessionId ? `?classArmId=${fromClassArmId}&sessionId=${fromSessionId}` : null;
  const { data, loading, error: fetchError } = useFetch<{ promotionPassMark: number; candidates: PromotionCandidate[] }>(
    query ? `/students/promotion-candidates${query}` : null,
    [fromClassArmId, fromSessionId]
  );

  useEffect(() => {
    if (data) {
      setChecked(Object.fromEntries(data.candidates.map((c) => [c.studentId, c.meetsStandard])));
      setResult(null);
    }
  }, [data]);

  const selectedIds = Object.entries(checked)
    .filter(([, v]) => v)
    .map(([id]) => id);

  async function promote() {
    if (!toClassArmId || !toSessionId) {
      setError("Pick the destination class and session first");
      return;
    }
    setError(null);
    setResult(null);
    setPromoting(true);
    try {
      const outcomes = await Promise.allSettled(
        selectedIds.map((studentId) =>
          api.post(`/students/${studentId}/enroll`, { classArmId: toClassArmId, sessionId: toSessionId })
        )
      );
      const promoted = outcomes.filter((o) => o.status === "fulfilled").length;
      const failed = outcomes.filter((o) => o.status === "rejected").length;
      setResult({ promoted, failed });
    } finally {
      setPromoting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Promote Students"
        subtitle="Review each student's average score, then move the ones ready for it into their new class"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-medium text-slate-800">From</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Class</Label>
              <Select value={fromClassArmId} onChange={(e) => setFromClassArmId(e.target.value)}>
                <option value="">Select class</option>
                {classArms?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.classLevel?.name} {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Session</Label>
              <Select value={fromSessionId} onChange={(e) => setFromSessionId(e.target.value)}>
                <option value="">Select session</option>
                {sessions?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-medium text-slate-800">To</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Class</Label>
              <Select value={toClassArmId} onChange={(e) => setToClassArmId(e.target.value)}>
                <option value="">Select class</option>
                {classArms?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.classLevel?.name} {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Session</Label>
              <Select value={toSessionId} onChange={(e) => setToSessionId(e.target.value)}>
                <option value="">Select session</option>
                {sessions?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Graduating a final-year class instead? Use the Alumni page's "promote student" action per student rather
            than picking a destination class here.
          </p>
        </Card>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {fetchError && <ErrorBanner message={fetchError} />}

      {!fromClassArmId || !fromSessionId ? (
        <p className="text-sm text-slate-500">Pick a source class and session to see its roster.</p>
      ) : loading ? (
        <Spinner />
      ) : !data?.candidates.length ? (
        <EmptyState message="No students enrolled in that class and session." />
      ) : (
        <div>
          <p className="mb-3 text-sm text-slate-500">
            Suggested pass mark: {data.promotionPassMark}% average. Students meeting it are pre-checked — untick or
            tick any student to override before promoting.
          </p>
          <Table>
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Admission No.</th>
                <th className="px-4 py-3">Average</th>
                <th className="px-4 py-3">Standard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.candidates.map((c) => (
                <tr key={c.studentId}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked[c.studentId] ?? false}
                      onChange={(e) => setChecked({ ...checked, [c.studentId]: e.target.checked })}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.admissionNumber}</td>
                  <td className="px-4 py-3">{c.average !== null ? c.average.toFixed(1) : "No results"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={c.meetsStandard ? "success" : "danger"}>{c.meetsStandard ? "Meets" : "Below"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={promote} disabled={promoting || !selectedIds.length}>
              {promoting ? "Promoting..." : `Promote ${selectedIds.length} selected student(s)`}
            </Button>
            {result && (
              <p className="text-sm text-slate-600">
                {result.promoted} promoted{result.failed ? `, ${result.failed} failed` : ""}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
