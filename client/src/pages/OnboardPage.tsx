import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Card, ErrorBanner, Input, Label, Select } from "../components/ui";
import { apiErrorMessage } from "../api/client";

const PLAN_OPTIONS = [
  { value: "STARTER", label: "Starter", students: "1–150 students", price: "₦50,000/term" },
  { value: "GROWTH", label: "Growth", students: "151–400 students", price: "₦100,000/term" },
  { value: "PROFESSIONAL", label: "Professional", students: "401–800 students", price: "₦175,000/term" },
  { value: "ENTERPRISE", label: "Enterprise", students: "801–1,500 students", price: "₦280,000/term" },
] as const;

function resolvePlanFromQuery(raw: string | null): (typeof PLAN_OPTIONS)[number]["value"] {
  const match = PLAN_OPTIONS.find((p) => p.value === raw?.toUpperCase());
  return match?.value ?? "STARTER";
}

export function OnboardPage() {
  const { onboardSchool, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    schoolName: "",
    slug: "",
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [planTier, setPlanTier] = useState<(typeof PLAN_OPTIONS)[number]["value"]>(() =>
    resolvePlanFromQuery(searchParams.get("plan"))
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onboardSchool({ ...form, country: "Nigeria", currency: "NGN", planTier });
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 text-xl font-bold text-brand-700">Register your school</h1>
        <p className="mb-6 text-sm text-slate-500">Start a 30-day free trial. No card required.</p>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>School name</Label>
            <Input required value={form.schoolName} onChange={(e) => update("schoolName", e.target.value)} />
          </div>
          <div>
            <Label>School URL slug (optional)</Label>
            <Input
              placeholder="e.g. brightfuture-academy — leave blank to auto-generate"
              pattern="[a-z0-9-]*"
              value={form.slug}
              onChange={(e) => update("slug", e.target.value.toLowerCase())}
            />
          </div>
          <div>
            <Label>Plan</Label>
            <Select value={planTier} onChange={(e) => setPlanTier(e.target.value as typeof planTier)}>
              {PLAN_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} — {p.students} — {p.price}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-slate-500">
              Founding Schools Programme pricing for your first 1,000-school cohort — change anytime after signup.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Admin first name</Label>
              <Input required value={form.adminFirstName} onChange={(e) => update("adminFirstName", e.target.value)} />
            </div>
            <div>
              <Label>Admin last name</Label>
              <Input required value={form.adminLastName} onChange={(e) => update("adminLastName", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Admin email</Label>
            <Input type="email" required value={form.adminEmail} onChange={(e) => update("adminEmail", e.target.value)} />
          </div>
          <div>
            <Label>Admin password</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={form.adminPassword}
              onChange={(e) => update("adminPassword", e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Creating school..." : "Create school"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already registered?{" "}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
