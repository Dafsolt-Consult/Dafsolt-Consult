import { useEffect } from "react";
import { tokenStore } from "../api/client";
import { Card, Spinner } from "../components/ui";

/**
 * Landing page for the dafsolt-core (id.dafsolt.cloud) SSO callback. The
 * Gateway redirects here with `#access=<token>&refresh=<token>` in the URL
 * *fragment* (never a query string, so the tokens never reach this server,
 * an access log, or a Referer header).
 *
 * This app is a Bearer-token SPA with no cookies/sessions — AuthContext's
 * loadMe() already runs `GET /auth/me` on every mount whenever a token is
 * present in localStorage, so all this page needs to do is write the two
 * tokens into the exact keys tokenStore already uses, then hard-navigate to
 * "/" so AuthProvider remounts fresh and picks them up on its own. No React
 * Router `navigate()` — a hard `window.location.href` guarantees a true
 * remount instead of relying on AuthProvider re-running loadMe() for a
 * client-side transition it has no reason to expect.
 */
export function SsoLandingPage() {
  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const access = params.get("access");
    const refresh = params.get("refresh");

    if (access && refresh) {
      tokenStore.setTokens(access, refresh);
      window.location.href = "/";
    } else {
      window.location.href = "/login";
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="flex w-full max-w-sm flex-col items-center gap-3 py-8 text-center">
        <Spinner />
        <p className="text-sm text-slate-500">Signing you in…</p>
      </Card>
    </div>
  );
}
