// Bakes the rendered LandingPage markup into the built index.html so
// crawlers/link-unfurlers that don't execute JS see real content instead of
// an empty <div id="root">. Runs after `vite build` (dist/index.html exists)
// and after `vite build --ssr src/entry-prerender.tsx` (dist-ssr/ exists).
// The real app still boots via createRoot in main.tsx and fully replaces
// this markup on load, so there's no hydration-parity requirement.
import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const clientDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const indexPath = path.join(clientDir, "dist", "index.html");
const ssrEntryPath = path.join(clientDir, "dist-ssr", "entry-prerender.js");

const { renderLanding } = await import(ssrEntryPath);
const landingHtml = renderLanding();

const shell = await readFile(indexPath, "utf8");
const marker = '<div id="root"></div>';
if (!shell.includes(marker)) {
  throw new Error(`prerender: expected to find ${marker} in dist/index.html`);
}
const withLanding = shell.replace(marker, `<div id="root">${landingHtml}</div>`);
await writeFile(indexPath, withLanding);

// dist-ssr is a build-time-only artifact; don't ship it in the image.
await rm(path.join(clientDir, "dist-ssr"), { recursive: true, force: true });

console.log(`prerender: injected ${landingHtml.length} chars of landing markup into dist/index.html`);
