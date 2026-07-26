import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { kioskApi, kioskTokenStore } from "../../api/kioskClient";
import { apiErrorMessage } from "../../api/client";
import { Button, Card, ErrorBanner, Input, Label } from "../../components/ui";

export function KioskLoginPage() {
  const navigate = useNavigate();
  const [tenantSlug, setTenantSlug] = useState("");
  const [fullName, setFullName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await kioskApi.post("/login", { tenantSlug, fullName, admissionNumber });
      kioskTokenStore.setAccessToken(data.accessToken);
      navigate("/kiosk");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">CBT Exam Hall</h1>
        <p className="mb-6 text-sm text-slate-500">
          Enter your details exactly as your invigilator instructs. Ask a member of staff if you're not sure.
        </p>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>School code</Label>
            <Input required value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="Given by your school" />
          </div>
          <div>
            <Label>Full name</Label>
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As on your admission record" />
          </div>
          <div>
            <Label>Admission / registration number</Label>
            <Input required value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Verifying..." : "Continue to exam"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
