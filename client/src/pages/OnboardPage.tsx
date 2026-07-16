import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Card, ErrorBanner, Input, Label } from "../components/ui";
import { apiErrorMessage } from "../api/client";

export function OnboardPage() {
  const { onboardSchool, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    schoolName: "",
    slug: "",
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPassword: "",
  });
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
      await onboardSchool({ ...form, country: "Nigeria", currency: "NGN" });
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
            <Label>School URL slug</Label>
            <Input
              required
              placeholder="e.g. brightfuture-academy"
              pattern="[a-z0-9-]+"
              value={form.slug}
              onChange={(e) => update("slug", e.target.value.toLowerCase())}
            />
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
