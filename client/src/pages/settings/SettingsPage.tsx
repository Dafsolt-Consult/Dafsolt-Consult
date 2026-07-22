import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Label, PageHeader, Spinner, Table } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { AuditLogEntry, Paginated, TenantProfile } from "../../types";

const TABS = ["School Profile", "Audit Log"] as const;

export function SettingsPage() {
  const { user } = useAuth();
  const isSchoolAdmin = user?.role === "SCHOOL_ADMIN";
  const [tab, setTab] = useState<(typeof TABS)[number]>(isSchoolAdmin ? "School Profile" : "Audit Log");

  return (
    <div>
      <PageHeader title="Settings" subtitle={isSchoolAdmin ? "School profile and activity log" : "Platform-wide activity log"} />

      {isSchoolAdmin && (
        <div className="mb-6 flex gap-2 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${
                tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === "School Profile" && isSchoolAdmin && <SchoolProfileTab />}
      {tab === "Audit Log" && <AuditLogTab />}
    </div>
  );
}

function SchoolProfileTab() {
  const { data: tenant, loading, error, refetch } = useFetch<TenantProfile>("/tenants/me");
  const [form, setForm] = useState<Partial<TenantProfile>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tenant) setForm(tenant);
  }, [tenant]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await api.patch("/tenants/me", {
        name: form.name,
        logoUrl: form.logoUrl || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        currency: form.currency,
        timezone: form.timezone,
      });
      setSaved(true);
      refetch();
    } catch (err) {
      setSaveError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!tenant) return null;

  return (
    <Card className="max-w-xl">
      <div className="mb-4 flex items-center gap-2">
        <Badge tone={tenant.subscriptionStatus === "ACTIVE" ? "success" : "warning"}>{tenant.subscriptionStatus}</Badge>
        <Badge>{tenant.planTier} plan</Badge>
      </div>

      {saveError && (
        <div className="mb-4">
          <ErrorBanner message={saveError} />
        </div>
      )}
      {saved && <p className="mb-4 rounded-lg bg-brand-50 px-4 py-2 text-sm text-brand-800">Saved.</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>School name</Label>
          <Input required value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Logo URL</Label>
          <Input type="url" value={form.logoUrl ?? ""} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
        </div>
        <div>
          <Label>Address</Label>
          <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>City</Label>
            <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <Label>State</Label>
            <Input value={form.state ?? ""} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Phone</Label>
            <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Currency code</Label>
            <Input maxLength={3} value={form.currency ?? ""} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <Label>Timezone</Label>
            <Input value={form.timezone ?? ""} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </div>
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}

function describeAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function AuditLogTab() {
  const { data, loading, error } = useFetch<Paginated<AuditLogEntry>>("/audit-logs");

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!data?.items.length) return <EmptyState message="No activity recorded yet." />;

  return (
    <Table>
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
        <tr>
          <th className="px-4 py-3">When</th>
          <th className="px-4 py-3">Action</th>
          <th className="px-4 py-3">By</th>
          {data.items.some((i) => i.tenant) && <th className="px-4 py-3">School</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {data.items.map((entry) => (
          <tr key={entry.id}>
            <td className="px-4 py-3 text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td>
            <td className="px-4 py-3 font-medium text-slate-800">{describeAction(entry.action)}</td>
            <td className="px-4 py-3 text-slate-600">
              {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName} (${entry.actor.role.replace("_", " ")})` : "System"}
            </td>
            {entry.tenant && <td className="px-4 py-3 text-slate-600">{entry.tenant.name}</td>}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
