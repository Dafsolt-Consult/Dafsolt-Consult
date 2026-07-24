import { api, apiErrorMessage } from "../../api/client";
import { Button, Card, EmptyState, ErrorBanner, PageHeader, Spinner } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { AppNotification } from "../../types";
import { useState } from "react";

export function NotificationsPage() {
  const { data: notifications, loading, error, refetch } = useFetch<AppNotification[]>("/notifications");
  const [actionError, setActionError] = useState<string | null>(null);

  async function markRead(id: string) {
    setActionError(null);
    try {
      await api.post(`/notifications/${id}/read`);
      refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  }

  async function markAllRead() {
    setActionError(null);
    try {
      await api.post("/notifications/read-all");
      refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Alerts for new assignments, exam results, fee reminders and announcements"
        actions={notifications?.some((n) => !n.readAt) ? <Button variant="secondary" onClick={markAllRead}>Mark all read</Button> : undefined}
      />
      {error && <ErrorBanner message={error} />}
      {actionError && (
        <div className="mb-4">
          <ErrorBanner message={actionError} />
        </div>
      )}
      {loading ? (
        <Spinner />
      ) : !notifications?.length ? (
        <EmptyState message="No notifications yet." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={!n.readAt ? "border-brand-300 bg-brand-50/40" : undefined}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  {n.subject && <p className="font-medium text-slate-800">{n.subject}</p>}
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.readAt && (
                  <Button variant="ghost" onClick={() => markRead(n.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
