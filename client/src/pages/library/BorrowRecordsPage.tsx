import { useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, EmptyState, ErrorBanner, PageHeader, Spinner, Table } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";

interface BorrowRecord {
  id: string;
  status: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string | null;
  fineAmount: number;
  isOverdue: boolean;
  book: { title: string };
  student?: { user: { firstName: string; lastName: string } } | null;
  borrowerName?: string | null;
}

export function BorrowRecordsPage() {
  const { data, loading, error, refetch } = useFetch<BorrowRecord[]>("/library/borrow-records");
  const [returnError, setReturnError] = useState<string | null>(null);

  async function returnBook(id: string) {
    setReturnError(null);
    try {
      await api.post(`/library/borrow-records/${id}/return`);
      refetch();
    } catch (err) {
      setReturnError(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="Borrow Records" subtitle="Track physical book loans and returns" />
      {error && <ErrorBanner message={error} />}
      {returnError && (
        <div className="mb-4">
          <ErrorBanner message={returnError} />
        </div>
      )}
      {loading ? (
        <Spinner />
      ) : !data?.length ? (
        <EmptyState message="No borrow records yet." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Book</th>
              <th className="px-4 py-3">Borrower</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{r.book.title}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.student ? `${r.student.user.firstName} ${r.student.user.lastName}` : r.borrowerName ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{new Date(r.dueDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Badge tone={r.status === "RETURNED" ? "success" : r.isOverdue ? "danger" : "warning"}>
                    {r.status === "RETURNED" ? "Returned" : r.isOverdue ? "Overdue" : "Borrowed"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {r.status !== "RETURNED" && (
                    <Button variant="secondary" onClick={() => returnBook(r.id)}>
                      Mark returned
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
