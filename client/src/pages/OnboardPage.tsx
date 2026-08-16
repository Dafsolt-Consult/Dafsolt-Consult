import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ErrorBanner, Input, Label, Select } from "../components/ui";
import { apiErrorMessage } from "../api/client";
import { AuthGateShell } from "../components/AuthGateShell";
import { COUNTRIES, NIGERIAN_STATES } from "../lib/geography";

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
    address: "",
    landmark: "",
    country: "Nigeria",
    state: "",
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPhone: "",
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
      await onboardSchool({ ...form, currency: "NGN", planTier });
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGateShell
      title="Open your school's gate"
      subtitle="30-day guided trial. Founding Schools Programme pricing for your first year."
      footer={<>Already have an account? Use the sign-in link below.</>}
    >
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>School name</Label>
          <Input
            required
            value={form.schoolName}
            onChange={(e) => update("schoolName", e.target.value)}
            className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
          />
        </div>
        <div>
          <Label>School URL slug (optional)</Label>
          <Input
            placeholder="e.g. brightfuture-academy — leave blank to auto-generate"
            pattern="[a-z0-9-]*"
            value={form.slug}
            onChange={(e) => update("slug", e.target.value.toLowerCase())}
            className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
          />
        </div>
        <div>
          <Label>School address</Label>
          <Input
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Country</Label>
            <Select
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>State / region</Label>
            {form.country === "Nigeria" ? (
              <Select
                required
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
              >
                <option value="">Select state</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                required
                placeholder="State / region"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
              />
            )}
          </div>
        </div>
        <div>
          <Label>Closest landmark (optional)</Label>
          <Input
            placeholder="e.g. opposite First Bank"
            value={form.landmark}
            onChange={(e) => update("landmark", e.target.value)}
            className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
          />
        </div>
        <div>
          <Label>Plan</Label>
          <Select
            value={planTier}
            onChange={(e) => setPlanTier(e.target.value as typeof planTier)}
            className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
          >
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
            <Input
              required
              value={form.adminFirstName}
              onChange={(e) => update("adminFirstName", e.target.value)}
              className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
            />
          </div>
          <div>
            <Label>Admin last name</Label>
            <Input
              required
              value={form.adminLastName}
              onChange={(e) => update("adminLastName", e.target.value)}
              className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
            />
          </div>
        </div>
        <div>
          <Label>Admin email</Label>
          <Input
            type="email"
            required
            value={form.adminEmail}
            onChange={(e) => update("adminEmail", e.target.value)}
            className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
          />
        </div>
        <div>
          <Label>Admin phone number</Label>
          <Input
            type="tel"
            required
            value={form.adminPhone}
            onChange={(e) => update("adminPhone", e.target.value)}
            className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
          />
        </div>
        <div>
          <Label>Admin password</Label>
          <Input
            type="password"
            required
            minLength={8}
            value={form.adminPassword}
            onChange={(e) => update("adminPassword", e.target.value)}
            className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#2E3192] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating school..." : "Create school"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link to="/login" className="font-medium text-[#2E3192] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthGateShell>
  );
}
