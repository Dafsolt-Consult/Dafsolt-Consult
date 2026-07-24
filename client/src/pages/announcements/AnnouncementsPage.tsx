import { FormEvent, useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { Button, Card, EmptyState, ErrorBanner, Label, Modal, PageHeader, Select, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { Announcement, AnnouncementAudience } from "../../types";

export function AnnouncementsPage() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const { data: announcements, loading, error, refetch } = useFetch<Announcement[]>("/announcements");

  return (
    <div>
      <PageHeader
        title="School Announcements"
        subtitle="Official communications, notices and updates from school administration"
        actions={user?.role === "SCHOOL_ADMIN" ? <Button onClick={() => setShowCreate(true)}>+ Post announcement</Button> : undefined}
      />

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !announcements?.length ? (
        <EmptyState message="No announcements yet." />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-800">{a.title}</h3>
                <span className="text-xs text-slate-400">{new Date(a.publishedAt).toLocaleDateString()}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
              {a.createdBy && (
                <p className="mt-2 text-xs text-slate-400">
                  — {a.createdBy.firstName} {a.createdBy.lastName}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {showCreate && <CreateAnnouncementModal onClose={() => setShowCreate(false)} onCreated={refetch} />}
    </div>
  );
}

function CreateAnnouncementModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", body: "", audience: "ALL" as AnnouncementAudience });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/announcements", form);
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Post an announcement" onClose={onClose}>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Title</Label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <Label>Message</Label>
          <textarea
            required
            rows={5}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <Label>Audience</Label>
          <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as AnnouncementAudience })}>
            <option value="ALL">Everyone</option>
            <option value="STAFF">Staff only</option>
            <option value="PARENTS">Parents only</option>
            <option value="PRIMARY">Primary school</option>
            <option value="JUNIOR_SECONDARY">Junior Secondary</option>
            <option value="SENIOR_SECONDARY">Senior Secondary</option>
          </Select>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Posting..." : "Post announcement"}
        </Button>
      </form>
    </Modal>
  );
}
