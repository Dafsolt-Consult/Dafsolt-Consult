import { FormEvent, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { useFetch } from "../../hooks/useFetch";
import { Button, Card, ErrorBanner, Input, Label, PageHeader, Spinner } from "../../components/ui";

interface TenantProfile {
  id: string;
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  currency: string;
  timezone: string;
  promotionPassMark: number;
}

const FIELDS: { key: keyof TenantProfile; label: string }[] = [
  { key: "name", label: "School name" },
  { key: "logoUrl", label: "Logo URL" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "currency", label: "Currency code (e.g. NGN)" },
  { key: "timezone", label: "Timezone (e.g. Africa/Lagos)" },
];

export function SettingsPage() {
  const { data: tenant, loading, error } = useFetch<TenantProfile>("/tenants/me");
  const [form, setForm] = useState<Partial<TenantProfile>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tenant) setForm(tenant);
  }, [tenant]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.patch("/tenants/me", {
        name: form.name || undefined,
        logoUrl: form.logoUrl || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        currency: form.currency || undefined,
        timezone: form.timezone || undefined,
        promotionPassMark: form.promotionPassMark ? Number(form.promotionPassMark) : undefined,
      });
      setSaved(true);
    } catch (err) {
      setSaveError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="School settings" subtitle="Update your school's profile" />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : (
        <Card className="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {FIELDS.map(({ key, label }) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  value={(form[key] as string) ?? ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <Label>Promotion pass mark (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.promotionPassMark ?? ""}
                onChange={(e) => setForm({ ...form, promotionPassMark: Number(e.target.value) })}
              />
              <p className="mt-1 text-xs text-slate-500">
                Suggested average score for a student to be marked ready for promotion — the Promotions page uses
                this to pre-check students, but a school admin can always override it per student.
              </p>
            </div>
            {saveError && <ErrorBanner message={saveError} />}
            {saved && <p className="text-sm text-brand-700">Saved.</p>}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
