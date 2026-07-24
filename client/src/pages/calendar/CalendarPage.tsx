import { FormEvent, useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { CalendarEvent, CalendarEventType } from "../../types";

export function CalendarPage() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const { data: events, loading, error, refetch } = useFetch<CalendarEvent[]>("/calendar");

  return (
    <div>
      <PageHeader
        title="School Calendar"
        subtitle="Academic dates, holidays, events and examination schedules"
        actions={user?.role === "SCHOOL_ADMIN" ? <Button onClick={() => setShowCreate(true)}>+ Add event</Button> : undefined}
      />

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !events?.length ? (
        <EmptyState message="No calendar events yet." />
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <Card key={e.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{e.title}</p>
                <p className="text-sm text-slate-500">
                  {new Date(e.startDate).toLocaleDateString()}
                  {e.endDate ? ` – ${new Date(e.endDate).toLocaleDateString()}` : ""}
                </p>
                {e.description && <p className="mt-1 text-sm text-slate-600">{e.description}</p>}
              </div>
              <Badge>{e.type}</Badge>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} onCreated={refetch} />}
    </div>
  );
}

function CreateEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", type: "EVENT" as CalendarEventType, startDate: "", endDate: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/calendar", { ...form, endDate: form.endDate || undefined });
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add calendar event" onClose={onClose}>
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
          <Label>Type</Label>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CalendarEventType })}>
            <option value="EVENT">Event</option>
            <option value="HOLIDAY">Holiday</option>
            <option value="EXAM">Examination</option>
            <option value="ACADEMIC">Academic</option>
            <option value="MEETING">Meeting</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start date</Label>
            <Input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div>
            <Label>End date (optional)</Label>
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : "Add event"}
        </Button>
      </form>
    </Modal>
  );
}
