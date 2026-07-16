import { FormEvent, useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { Book, Paginated } from "../../types";

export function LibraryCatalogPage() {
  const { user } = useAuth();
  const canManage = user?.role === "SCHOOL_ADMIN" || user?.role === "LIBRARIAN";
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [borrowBook, setBorrowBook] = useState<Book | null>(null);

  const { data, loading, error, refetch } = useFetch<Paginated<Book>>(`/library/books?search=${encodeURIComponent(search)}`, [search]);

  return (
    <div>
      <PageHeader
        title="Library"
        subtitle={`${data?.total ?? 0} titles · physical & digital resources for primary & secondary students`}
        actions={canManage ? <Button onClick={() => setShowCreate(true)}>+ Add book</Button> : undefined}
      />

      <div className="mb-4 max-w-xs">
        <Input placeholder="Search title or author" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !data?.items.length ? (
        <EmptyState message="No books in the catalog yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.items.map((book) => (
            <Card key={book.id}>
              {book.coverImageUrl && <img src={book.coverImageUrl} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />}
              <h3 className="font-semibold text-slate-800">{book.title}</h3>
              <p className="text-sm text-slate-500">{book.author}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge>{book.format}</Badge>
                {book.targetAudience && <Badge>{book.targetAudience.replace("_", " ")}</Badge>}
              </div>
              {book.format !== "EBOOK" && <p className="mt-2 text-xs text-slate-500">{book.availableCopies} of {book.totalCopies} copies available</p>}

              <div className="mt-3 flex gap-2">
                {(book.format === "EBOOK" || book.format === "BOTH") && book.ebookFileUrl && (
                  <a href={book.ebookFileUrl} target="_blank" rel="noreferrer">
                    <Button variant="secondary">Read online</Button>
                  </a>
                )}
                {canManage && book.format !== "EBOOK" && (
                  <Button variant="secondary" disabled={book.availableCopies < 1} onClick={() => setBorrowBook(book)}>
                    Borrow
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <CreateBookModal onClose={() => setShowCreate(false)} onCreated={refetch} />}
      {borrowBook && <BorrowBookModal book={borrowBook} onClose={() => setBorrowBook(null)} onDone={refetch} />}
    </div>
  );
}

function CreateBookModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: "",
    author: "",
    format: "PHYSICAL",
    targetAudience: "",
    totalCopies: "1",
    ebookFileUrl: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/library/books", {
        ...form,
        totalCopies: Number(form.totalCopies),
        targetAudience: form.targetAudience || undefined,
        ebookFileUrl: form.ebookFileUrl || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add a book" onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Author</Label>
          <Input required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
        </div>
        <div>
          <Label>Format</Label>
          <Select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
            <option value="PHYSICAL">Physical only</option>
            <option value="EBOOK">Digital only</option>
            <option value="BOTH">Physical & digital</option>
          </Select>
        </div>
        <div>
          <Label>Target audience</Label>
          <Select value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}>
            <option value="">All levels</option>
            <option value="PRIMARY">Primary</option>
            <option value="JUNIOR_SECONDARY">Junior Secondary</option>
            <option value="SENIOR_SECONDARY">Senior Secondary</option>
          </Select>
        </div>
        {form.format !== "EBOOK" && (
          <div>
            <Label>Total copies</Label>
            <Input type="number" min={0} value={form.totalCopies} onChange={(e) => setForm({ ...form, totalCopies: e.target.value })} />
          </div>
        )}
        {form.format !== "PHYSICAL" && (
          <div>
            <Label>Ebook file URL</Label>
            <Input type="url" value={form.ebookFileUrl} onChange={(e) => setForm({ ...form, ebookFileUrl: e.target.value })} />
          </div>
        )}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : "Add book"}
        </Button>
      </form>
    </Modal>
  );
}

function BorrowBookModal({ book, onClose, onDone }: { book: Book; onClose: () => void; onDone: () => void }) {
  const [studentId, setStudentId] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/library/books/${book.id}/borrow`, { studentId: studentId || undefined, dueDate });
      onDone();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Borrow "${book.title}"`} onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Student ID (leave blank for staff borrower)</Label>
          <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Student record ID" />
        </div>
        <div>
          <Label>Due date</Label>
          <Input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Borrowing..." : "Confirm borrow"}
        </Button>
      </form>
    </Modal>
  );
}
