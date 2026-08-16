import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ErrorBanner, Input, Label } from "../components/ui";
import { apiErrorMessage } from "../api/client";
import { AuthGateShell } from "../components/AuthGateShell";

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
    <AuthGateShell
      title="Welcome back"
      subtitle="Sign in at your school's gate"
      footer={
        <>
          A Dafsolt Consult product, built for schools across Africa.
        </>
      }
    >
      {passwordResetSuccess && (
        <div className="mb-4 rounded-lg bg-[#D0E3FF] px-4 py-3 text-sm text-[#2E3192]">
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
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
          />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus:!border-[#2E3192] focus:!ring-[#2E3192]"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#2E3192] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="font-medium text-[#2E3192] hover:underline">
          Forgot password?
        </Link>
      </p>

      <p className="mt-3 text-center text-sm text-slate-500">
        New school?{" "}
        <Link to="/onboard" className="font-medium text-[#2E3192] hover:underline">
          Register your school
        </Link>
      </p>
    </AuthGateShell>
  );
}
