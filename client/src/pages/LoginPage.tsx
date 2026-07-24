import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Card, ErrorBanner, Input, Label } from "../components/ui";
import { apiErrorMessage } from "../api/client";

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordResetSuccess = Boolean((location.state as { passwordResetSuccess?: boolean } | null)?.passwordResetSuccess);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-bold text-brand-700">School Manager</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to your school account</p>

        {passwordResetSuccess && (
          <div className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
            Your password has been reset. Please sign in with your new password.
          </div>
        )}

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-3 text-center text-sm">
          <Link to="/forgot-password" className="font-medium text-brand-700 hover:underline">
            Forgot password?
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-slate-500">
          New school?{" "}
          <Link to="/onboard" className="font-medium text-brand-700 hover:underline">
            Register your school
          </Link>
        </p>
      </Card>
    </div>
  );
}
