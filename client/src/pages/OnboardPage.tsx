import { useEffect } from "react";
import { Card, Spinner } from "../components/ui";

// Redirects to Gateway's registration wizard — the single source of
// truth for new tenants. Mirrors SsoLandingPage.tsx's own pattern: a
// hard window.location.href, not React Router's Navigate/navigate(),
// since this needs a true cross-origin browser navigation, not an
// internal SPA route change.
export function OnboardPage() {
  useEffect(() => {
    window.location.href = "https://id.dafsolt.cloud/register?industry=EDUCATION";
  }, []);

  return (
    <Card>
      <Spinner />
    </Card>
  );
}
