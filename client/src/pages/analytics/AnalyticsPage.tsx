import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, EmptyState, ErrorBanner, PageHeader, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";

// Validated categorical pair (blue/green, adjacent slots 1-2) — see the
// dataviz skill's reference palette. Single-series charts use the app's own
// brand green since there's no adjacent-pair CVD constraint on one series.
const SERIES_BLUE = "#2a78d6";
const SERIES_GREEN = "#008300";
const BRAND_GREEN = "#16a34a";
const GRID = "#e1e0d9";
const AXIS = "#898781";

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

interface Overview {
  enrollmentTrend: { session: string; count: number }[];
  attendanceTrend: { date: string; rate: number }[];
  feeCollectionByTerm: { term: string; billed: number; paid: number; rate: number }[];
  examPerformance: { examTitle: string; attempts: number; averageScore: number; passRate: number }[];
}

function ChartSection({
  title,
  subtitle,
  data,
  columns,
  children,
}: {
  title: string;
  subtitle?: string;
  data: Record<string, string | number>[];
  columns: { key: string; label: string }[];
  children: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-medium text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <button className="text-xs text-brand-700 hover:underline" onClick={() => setShowTable((v) => !v)}>
          {showTable ? "Show chart" : "View as table"}
        </button>
      </div>

      {!data.length ? (
        <EmptyState message="Not enough data yet." />
      ) : showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase text-slate-500">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-2 py-1">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} className="px-2 py-1 text-slate-700">
                      {row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {children as never}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export function AnalyticsPage() {
  const { data, loading, error } = useFetch<Overview>("/analytics/overview");

  return (
    <div>
      <PageHeader title="Analytics & Reporting" subtitle="Enrollment, attendance, fee collection and exam performance trends" />

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !data ? null : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartSection
            title="Enrollment trend"
            subtitle="Students enrolled per academic session"
            data={data.enrollmentTrend}
            columns={[
              { key: "session", label: "Session" },
              { key: "count", label: "Students" },
            ]}
          >
            <BarChart data={data.enrollmentTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="session" tick={{ fill: AXIS, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Students" fill={BRAND_GREEN} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ChartSection>

          <ChartSection
            title="Attendance rate"
            subtitle="Daily school-wide attendance, last 30 days"
            data={data.attendanceTrend}
            columns={[
              { key: "date", label: "Date" },
              { key: "rate", label: "Rate (%)" },
            ]}
          >
            <LineChart data={data.attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: AXIS, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" name="Attendance %" stroke={BRAND_GREEN} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartSection>

          <ChartSection
            title="Fee collection by term"
            subtitle="Billed vs. collected, current session"
            data={data.feeCollectionByTerm.map((t) => ({ ...t, billed: naira(t.billed), paid: naira(t.paid), rate: `${t.rate}%` }))}
            columns={[
              { key: "term", label: "Term" },
              { key: "billed", label: "Billed" },
              { key: "paid", label: "Paid" },
              { key: "rate", label: "Collection rate" },
            ]}
          >
            <BarChart data={data.feeCollectionByTerm}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="term" tick={{ fill: AXIS, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => naira(v)} />
              <Tooltip formatter={(v) => naira(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="billed" name="Billed" fill={SERIES_BLUE} radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="paid" name="Paid" fill={SERIES_GREEN} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ChartSection>

          <ChartSection
            title="Exam performance"
            subtitle="Average score, 10 most recent exams with submissions"
            data={data.examPerformance}
            columns={[
              { key: "examTitle", label: "Exam" },
              { key: "averageScore", label: "Avg. score" },
              { key: "passRate", label: "Pass rate (%)" },
              { key: "attempts", label: "Attempts" },
            ]}
          >
            <BarChart data={data.examPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="examTitle" tick={{ fill: AXIS, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} hide />
              <YAxis tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="averageScore" name="Average score" fill={BRAND_GREEN} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ChartSection>
        </div>
      )}
    </div>
  );
}
