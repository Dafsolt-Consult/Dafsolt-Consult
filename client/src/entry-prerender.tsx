import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { LandingPage } from "./pages/LandingPage";

// Used only at build time (see scripts/prerender.mjs) to bake real marketing
// copy into the shipped index.html for crawlers/link-unfurlers that don't
// execute JS. The real app still boots normally on top of this via
// createRoot (not hydrateRoot) in main.tsx, so there's no hydration-parity
// requirement here — this output is just a static first-paint shell.
export function renderLanding() {
  return renderToStaticMarkup(
    <StaticRouter location="/">
      <LandingPage />
    </StaticRouter>
  );
}
