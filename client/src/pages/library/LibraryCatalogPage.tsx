import { FormEvent, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { Book, Paginated } from "../../types";

interface BookCategory {
  id: string;
  name: string;
}

interface StudentOption {
  id: string;
  admissionNumber: string;
  user: { firstName: string; lastName: string };
}

// Two-step upload matching Core's own pre-signed-URL pattern: ask this
// app's backend for an upload URL (it proxies to dafsolt-core), then PUT
// the file bytes DIRECTLY to R2 with it — never through this app's own
// server. Returns the Core FileObject id to store on the Book record.
async function uploadLibraryFile(file: File): Promise<string> {
  const { data } = await api.post<{ uploadUrl: string; fileId: string }>("/library/files/upload-url", {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });
  const putRes = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) throw new Error(`Upload to storage failed (${putRes.status})`);
  return data.fileId;
}

// Fetches a fresh pre-signed download URL on mount rather than storing a
// raw one — R2 URLs expire (15 min), so this is deliberately re-requested
// each time the page renders this book, not cached across sessions.
function useLibraryFileDownloadUrl(bookId: string, fileId: string | null | undefined, kind: "cover" | "ebook") {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!fileId) return;
    let cancelled = false;
    api
      .get<{ downloadUrl: string }>(`/library/books/${bookId}/${kind}/download-url`)
      .then(({ data }) => {
        if (!cancelled) setUrl(data.downloadUrl);
      })
      .catch(() => {
        // A missing/expired file shouldn't break the catalog card — just
        // renders without a cover / without the "Read online" button.
      });
    return () => {
      cancelled = true;
    };
  }, [bookId, fileId, kind]);
  return url;
}

export function LibraryCatalogPage() {
  const { user } = useAuth();
  const canManage = user?.role === "SCHOOL_ADMIN" || user?.role === "LIBRARIAN";
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [borrowBook, setBorrowBook] = useState<Book | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: categories, refetch: refetchCategories } = useFetch<BookCategory[]>("/library/categories");

  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (categoryId) query.set("categoryId", categoryId);
  const { data, loading, error, refetch } = useFetch<Paginated<Book>>(`/library/books?${query}`, [search, categoryId]);

  async function deleteBook(book: Book) {
    if (!confirm(`Delete "${book.title}" from the catalog?`)) return;
    setActionError(null);
    try {
      await api.delete(`/library/books/${book.id}`);
      refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Library"
        subtitle={`${data?.total ?? 0} titles · physical & digital resources for primary & secondary students`}
        actions={canManage ? <Button onClick={() => setShowCreate(true)}>+ Add book</Button> : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Search title or author" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select className="w-52" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {canManage && (
          <NewCategoryButton
            onCreated={() => {
              refetchCategories();
            }}
          />
        )}
      </div>

      {(error || actionError) && <ErrorBanner message={error || actionError!} />}
      {loading ? (
        <Spinner />
      ) : !data?.items.length ? (
        <EmptyState message="No books in the catalog yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.items.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              canManage={canManage}
              onBorrow={() => setBorrowBook(book)}
              onEdit={() => setEditBook(book)}
              onDelete={() => deleteBook(book)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <BookFormModal
          categories={categories ?? []}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            refetch();
            setShowCreate(false);
          }}
        />
      )}
      {editBook && (
        <BookFormModal
          book={editBook}
          categories={categories ?? []}
          onClose={() => setEditBook(null)}
          onSaved={() => {
            refetch();
            setEditBook(null);
          }}
        />
      )}
      {borrowBook && <BorrowBookModal book={borrowBook} onClose={() => setBorrowBook(null)} onDone={refetch} />}
    </div>
  );
}

function NewCategoryButton({ onCreated }: { onCreated: () => void }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/library/categories", { name });
      onCreated();
      setShow(false);
      setName("");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!show) {
    return (
      <Button variant="secondary" onClick={() => setShow(true)}>
        + New category
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input placeholder="Category name" required value={name} onChange={(e) => setName(e.target.value)} className="w-40" />
      <Button type="submit" variant="secondary" disabled={submitting}>
        Save
      </Button>
      <Button type="button" variant="ghost" onClick={() => setShow(false)}>
        Cancel
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}

function BookCard({
  book,
  canManage,
  onBorrow,
  onEdit,
  onDelete,
}: {
  book: Book;
  canManage: boolean;
  onBorrow: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const coverUrl = useLibraryFileDownloadUrl(book.id, book.coverImageFileId, "cover");
  const ebookUrl = useLibraryFileDownloadUrl(book.id, book.ebookFileFileId, "ebook");

  return (
    <Card>
      {coverUrl && <img src={coverUrl} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />}
      <h3 className="font-semibold text-slate-800">{book.title}</h3>
      <p className="text-sm text-slate-500">{book.author}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge>{book.format}</Badge>
        {book.targetAudience && <Badge>{book.targetAudience.replace("_", " ")}</Badge>}
        {book.category && <Badge>{book.category.name}</Badge>}
      </div>
      {book.format !== "EBOOK" && <p className="mt-2 text-xs text-slate-500">{book.availableCopies} of {book.totalCopies} copies available</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {(book.format === "EBOOK" || book.format === "BOTH") && ebookUrl && (
          <a href={ebookUrl} target="_blank" rel="noreferrer">
            <Button variant="secondary">Read online</Button>
          </a>
        )}
        {canManage && book.format !== "EBOOK" && (
          <Button variant="secondary" disabled={book.availableCopies < 1} onClick={onBorrow}>
            Borrow
          </Button>
        )}
        {canManage && (
          <>
            <Button variant="ghost" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" onClick={onDelete}>
              Delete
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function BookFormModal({
  book,
  categories,
  onClose,
  onSaved,
}: {
  book?: Book;
  categories: BookCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!book;
  const [form, setForm] = useState({
    title: book?.title ?? "",
    author: book?.author ?? "",
    format: (book?.format ?? "PHYSICAL") as string,
    targetAudience: (book?.targetAudience ?? "") as string,
    totalCopies: String(book?.totalCopies ?? 1),
    categoryId: book?.category?.id ?? "",
  });
  // Existing (already-uploaded) file ids, vs. a newly-picked-but-not-yet-
  // uploaded File — kept separate so the actual upload only happens on
  // submit, not on every keystroke/selection.
  const [coverFileId, setCoverFileId] = useState(book?.coverImageFileId ?? undefined);
  const [ebookFileId, setEbookFileId] = useState(book?.ebookFileFileId ?? undefined);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [pendingEbookFile, setPendingEbookFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const [uploadedCoverFileId, uploadedEbookFileId] = await Promise.all([
        pendingCoverFile ? uploadLibraryFile(pendingCoverFile) : Promise.resolve(coverFileId),
        pendingEbookFile ? uploadLibraryFile(pendingEbookFile) : Promise.resolve(ebookFileId),
      ]);

      const payload = {
        ...form,
        totalCopies: Number(form.totalCopies),
        targetAudience: form.targetAudience || undefined,
        categoryId: form.categoryId || undefined,
        coverImageFileId: uploadedCoverFileId,
        ebookFileFileId: uploadedEbookFileId,
      };
      if (isEdit) {
        await api.patch(`/library/books/${book!.id}`, payload);
      } else {
        await api.post("/library/books", payload);
      }
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit "${book!.title}"` : "Add a book"} onClose={onClose}>
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
          <Label>Category</Label>
          <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
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
        <div>
          <Label>Cover image</Label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPendingCoverFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600"
          />
          {(pendingCoverFile || coverFileId) && !pendingCoverFile && <p className="mt-1 text-xs text-slate-500">Current cover kept unless you choose a new file.</p>}
        </div>
        {form.format !== "PHYSICAL" && (
          <div>
            <Label>Ebook file</Label>
            <input
              type="file"
              onChange={(e) => setPendingEbookFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600"
            />
            {ebookFileId && !pendingEbookFile && <p className="mt-1 text-xs text-slate-500">Current file kept unless you choose a new one.</p>}
          </div>
        )}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Add book"}
        </Button>
      </form>
    </Modal>
  );
}

function BorrowBookModal({ book, onClose, onDone }: { book: Book; onClose: () => void; onDone: () => void }) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [borrowerName, setBorrowerName] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/library/books/${book.id}/borrow`, {
        studentId: selectedStudent?.id,
        borrowerName: selectedStudent ? undefined : borrowerName || undefined,
        dueDate,
      });
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
        <div className="relative">
          <Label>Student</Label>
          <Input
            placeholder="Search student by name..."
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
        {!selectedStudent && (
          <div>
            <Label>Or staff borrower name</Label>
            <Input value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} placeholder="Leave blank if borrowing for a student" />
          </div>
        )}
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
