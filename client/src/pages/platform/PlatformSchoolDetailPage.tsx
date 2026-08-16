import { ReactNode, useState } from "react";
import { useParams } from "react-router-dom";
import { platformApi } from "../../api/platformClient";
import { apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, ErrorBanner, PageHeader } from "../../components/ui";
import { usePlatformFetch } from "../../hooks/usePlatformFetch";
import { PlatformTenantDetail } from "../../types/platform";

// Impersonation hands a short-lived (~15min, non-renewable) tenant access
// token to a new browser tab, written into the SAME localStorage keys the
// tenant app itself uses (api/client.ts's tokenStore) — so the new tab's
// normal AuthContext.loadMe() picks it up exactly like a real login. No
// refresh token is written, so it naturally logs out at expiry. This can't
// safely coexist with a real tenant session open in the same browser
// profile — acceptable for an internal admin tool.
const TENANT_ACCESS_TOKEN_KEY = "dafsolt.accessToken";

export function PlatformSchoolDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { data: tenant, loading, error } = usePlatformFetch<PlatformTenantDetail>(tenantId ? `/tenants/${tenantId}` : null);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  async function impersonate() {
    if (!tenantId) return;
    setImpersonateError(null);
    setImpersonating(true);
    // Opened synchronously, inside the click handler, before any `await` —
    // Safari (and Chrome after a delay) silently blocks window.open() once
    // it's no longer in the direct call stack of a user gesture, and
    // window.open() returns null instead of throwing, so a post-await open
    // just does nothing with no error. Navigate this already-open tab once
    // the token is ready instead of opening a new one then.
    const tab = window.open("", "_blank");
    try {
      const { data } = await platformApi.post(`/tenants/${tenantId}/impersonate`, {});
      localStorage.setItem(TENANT_ACCESS_TOKEN_KEY, data.accessToken);
      if (tab) tab.location.href = "/";
      else setImpersonateError("Your browser blocked the new tab — allow pop-ups for this site and try again.");
    } catch (err) {
      tab?.close();
      setImpersonateError(apiErrorMessage(err));
    } finally {
      setImpersonating(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;
  if (error) return <ErrorBanner message={error} />;
  if (!tenant) return null;

  return (
    <div>
      <PageHeader
        title={tenant.name}
        subtitle={tenant.slug}
        actions={
          <Button onClick={impersonate} disabled={impersonating}>
            {impersonating ? "Starting session..." : "Impersonate"}
          </Button>
        }
      />
      {impersonateError && (
        <div className="mb-4">
          <ErrorBanner message={impersonateError} />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">School profile</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Country" value={tenant.country} />
            <Row label="City / State" value={[tenant.city, tenant.state].filter(Boolean).join(", ") || "—"} />
            <Row label="Phone" value={tenant.phone ?? "—"} />
            <Row label="Email" value={tenant.email ?? "—"} />
            <Row label="Currency" value={tenant.currency} />
            <Row label="Timezone" value={tenant.timezone} />
          </dl>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Plan & usage</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Plan" value={<Badge>{tenant.planTier.replace("_", " ")}</Badge>} />
            <Row label="Status" value={<Badge tone={tenant.subscriptionStatus === "ACTIVE" ? "success" : "warning"}>{tenant.subscriptionStatus}</Badge>} />
            <Row label="Students" value={`${tenant._count.students} / ${tenant.maxStudents}`} />
            <Row label="Staff" value={`${tenant._count.users} / ${tenant.maxStaff}`} />
            <Row label="Trial ends" value={tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : "—"} />
            <Row label="Subscription ends" value={tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt).toLocaleDateString() : "—"} />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
