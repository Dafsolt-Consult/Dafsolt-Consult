# School Manager AI Chat → dafsolt-core Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Task 1 is the one exception — it is a one-off production data operation with no code artifact to review via diff, and must be run directly by the controller, not dispatched to a subagent** (same precedent as the production-deploy task in `dbos_core_erp_modules_expansion_2026_09_09`).

**Goal:** Migrate School Manager's public support-chat and authenticated in-app assistant off their own direct Groq calls onto dafsolt-core's already-hosted `POST /support/chat` and `POST /assistant/chat`, closing the last open item in DBOS Core module #6 (Communication & Collaboration).

**Architecture:** A new `CoreAiChatSyncService.ts` (port of Kitchen ERP's own service of the same purpose, adapted to this repo's plain Express/fetch style) owns the Core HTTP calls and the two auth paths — one fixed shared service account for the public support-chat, one per-tenant `core-sync-credentials`-backed account for the authenticated assistant. `SupportChatService`/`AssistantChatService` become thin wrappers: try Core, fall back to their existing local fallback text on `null` or any thrown error. `AccountContextBuilder` stays completely untouched. **Verified against dafsolt-core's real route source (`src/routes/assistant.js`) and Kitchen ERP's actual post-migration `AssistantChatService`, not assumed**: Core's `/assistant/chat` route itself does the ACTION-line extraction/validation server-side, using the exact `actions`/`knownIds` the caller sent it in that same request — the wrapper does a direct passthrough of Core's `{reply, actions}`, with no client-side re-extraction step. This is a real, deliberate change in *where* that validation runs (moved into Core), not a removal of it.

**Tech Stack:** Express, TypeScript, Prisma, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-10-ai-chat-core-migration-design.md`

## Global Constraints

- Zero behavior change in the failure path: Core disabled/unreachable/uncredentialed must fall back to the EXACT SAME local fallback-reply text these services return today.
- Both Core calls gated behind `DAFSOLT_CORE_AI_CHAT_ENABLED` (unset/false by default) — deploying this code changes nothing in production until the flag is explicitly turned on.
- The ACTION-line security boundary now lives in dafsolt-core's `/assistant/chat` route (verified in its source): it only ever resolves an `ACTION:` line against the `actions`/`knownIds` THIS request itself sent, never anything cached or re-derived. `AccountContextBuilder`'s job — computing the per-role `knownIds`/action catalog from real, current tenant data — is what makes that boundary meaningful, and stays completely unchanged.
- `royal-executive` and `blosom` must have a delivered `core_sync_credentials` row (Task 1) before `DAFSOLT_CORE_AI_CHAT_ENABLED` is ever turned on in production (Task 6) — turning it on before Task 1 completes would regress their assistant-chat from real answers to the generic fallback message.
- **`EDUCATION`'s `IndustryBlueprint.aiAssistantEnabled` is currently `false` in production** (verified 2026-09-10 — only `FOOD_SERVICE` has it `true`). Core's `/assistant/chat` route 403s any tenant whose industry isn't entitled, checked BEFORE the Groq call. Without flipping this to `true` (Task 1), assistant-chat would silently and permanently fall back to the generic error message for every School Manager tenant, not just royal-executive/blosom — this is a bigger deal than the credential-backfill gap and needs its own explicit go-ahead (this is a real "turn a feature on for this whole industry" decision, not a bug fix). Support-chat has no such gate (verified in `src/routes/support.js` — no industry check at all, matching its stateless/no-tenant character), so it is unaffected either way.

---

### Task 1: Register the AI-proxy Core account and backfill sync credentials (MANUAL — controller runs this directly, no subagent)

**Files:** none in `Dafsolt-Consult` — this task creates one Core tenant (`dafsolt-core`'s own database) and delivers 2 `core_sync_credentials` rows into `Dafsolt-Consult`'s own database via the existing HTTP receiver. A throwaway script is written to `dafsolt-core/scripts/` and deleted after use, matching this project's established "throwaway script, deleted after" convention for one-off production operations.

**Interfaces:**
- Produces: a real Core tenant `school-manager-ai-proxy` with a known email/password (for Task 6 Step 3's `SCHOOL_MANAGER_AI_PROXY_EMAIL`/`_PASSWORD` production `.env` values, read by Task 2's `env.ts` fields); `core_sync_credentials` rows for `royal-executive` and `blosom` with `status: 'delivered'` (consumed by Task 3's `credentialsForTenantSlug()` call); `IndustryBlueprint.aiAssistantEnabled = true` for `EDUCATION` (checked by Core's `/assistant/chat` route before every call — without this, that route 403s every School Manager tenant regardless of credentials).

**⚠️ Step 1a below changes a real production entitlement flag for an entire industry (every current and future EDUCATION/School-Manager tenant), not just this migration's 2 backfilled tenants. Confirm this specific step with the user before running it — it is a separate decision from the credential backfill.**

- [ ] **Step 1: Register the shared AI-proxy service account on dafsolt-core**

Run directly (this is a real production write — a new Core tenant, not a test):

```bash
curl -s -X POST https://id.dafsolt.cloud/core-api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "School Manager AI Proxy",
    "tenantSlug": "school-manager-ai-proxy",
    "email": "ai-proxy@school-manager.dafsolt-core.internal",
    "password": "<generate a strong random password, e.g. openssl rand -base64 32>"
  }'
```

Expected: `201`, response body contains `tenant.slug: "school-manager-ai-proxy"`. Record the email/password used — they become `SCHOOL_MANAGER_AI_PROXY_EMAIL`/`SCHOOL_MANAGER_AI_PROXY_PASSWORD`. Do not commit these anywhere — they go directly into the production `.env` file in Task 6 Step 3.

- [ ] **Step 1a: Enable the EDUCATION industry's AI-assistant entitlement (confirm with user first — see warning above)**

Verified 2026-09-10: `IndustryBlueprint.aiAssistantEnabled` for `EDUCATION` is currently `false` (only `FOOD_SERVICE` is `true`). Core's `/assistant/chat` route checks this per-request and 403s before ever reaching the Groq call if it's not `true` — this is a real, deliberate feature-entitlement gate (R5 in Core's own docblock), not a bug. Without this step, Task 6's assistant-chat deploy would be permanently non-functional for every School Manager tenant.

```bash
docker exec dafsolt-consult-postgres-1 psql -U dafsolt_core -d dafsolt_core \
  -c "UPDATE \"IndustryBlueprint\" SET \"aiAssistantEnabled\" = true WHERE industry = 'EDUCATION';"
```

Verify:
```bash
docker exec dafsolt-consult-postgres-1 psql -U dafsolt_core -d dafsolt_core \
  -c "SELECT industry, \"aiAssistantEnabled\" FROM \"IndustryBlueprint\" WHERE industry = 'EDUCATION';"
```
Expected: `aiAssistantEnabled | t`.

- [ ] **Step 2: Write the one-off credential-backfill script**

Create `dafsolt-core/scripts/backfill-school-manager-ai-proxy-credentials.js` (temporary — deleted in Step 5):

```js
"use strict";

// ONE-OFF, temporary: delivers a SCHOOL_MANAGER core_sync_credentials row
// to royal-executive and blosom, which are already-active TenantModule
// rows that predate the auto-provisioning receiver and so were never
// automatically delivered one (provisionModules()'s batch only processes
// status: requested|retrying). See docs/superpowers/specs/
// 2026-09-10-ai-chat-core-migration-design.md for the full reasoning.
// Delete this file once both tenants show status: 'delivered'.

const { PrismaClient } = require("@prisma/client");
const { createSyncCredential, deliverSyncCredential } = require("../src/lib/tenantSyncCredentials");
const { loadFromEnv } = require("../src/config");
const { loadKeys } = require("../src/keys");
const { createTokenService } = require("../src/lib/jwt");

const DELIVERY_URL = process.env.SCHOOL_MANAGER_SYNC_CREDENTIAL_URL;
const SLUGS = ["royal-executive", "blosom"];

async function main() {
  if (!DELIVERY_URL) {
    throw new Error("SCHOOL_MANAGER_SYNC_CREDENTIAL_URL is not set in this environment");
  }

  const prisma = new PrismaClient();
  const cfg = loadFromEnv();
  const tokenService = createTokenService(loadKeys(cfg), cfg);

  for (const slug of SLUGS) {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      console.error(`${slug}: no such tenant, skipping`);
      continue;
    }

    const { credential, email, password, created } = await createSyncCredential(prisma, {
      tenant,
      module: "SCHOOL_MANAGER",
    });

    if (!created) {
      console.log(`${slug}: credential row already exists, status=${credential.status} — not re-delivering`);
      continue;
    }

    const result = await deliverSyncCredential(prisma, tokenService, {
      tenant,
      module: "SCHOOL_MANAGER",
      email,
      password,
      deliveryUrl: DELIVERY_URL,
    });
    console.log(`${slug}: delivered=${result.delivered}`, result.error ?? "");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Run it against real production**

```bash
cd /root/dafsolt-core
docker run --rm --network dafsolt-consult_default --env-file .env \
  -v "$(pwd)":/app -w /app dafsolt-core:deps \
  node scripts/backfill-school-manager-ai-proxy-credentials.js
```

Expected output: `royal-executive: delivered=true` and `blosom: delivered=true`. If either line says `delivered=false`, read the printed error, fix the underlying issue (e.g. `SCHOOL_MANAGER_SYNC_CREDENTIAL_URL` unreachable from this network), and re-run — the script is idempotent for the "already exists" case but will retry delivery for a `failed`/`pending` row (see `createSyncCredential`'s `created: false` branch — a genuine retry of a stuck row needs `rotateSyncCredential` instead; check `credential.status` in the printed output first).

- [ ] **Step 4: Verify directly against both databases**

```bash
docker exec dafsolt-consult-postgres-1 psql -U dafsolt_core -d dafsolt_core \
  -c "SELECT tenant.slug, tsc.status FROM \"TenantSyncCredential\" tsc JOIN \"Tenant\" tenant ON tenant.id = tsc.\"tenantId\" WHERE tenant.slug IN ('royal-executive','blosom') AND tsc.module = 'SCHOOL_MANAGER';"
```
Expected: both rows, `status = 'delivered'`. (Note: `dafsolt-core`'s own Postgres runs inside the shared `dafsolt-consult-postgres-1` container as the `dafsolt_core` database, not a separate container — verified 2026-09-10.)

```bash
docker exec dafsolt-consult-postgres-1 psql -U dafsolt_prod -d dafsolt_school \
  -c "SELECT t.slug, c.status FROM tenants t JOIN core_sync_credentials c ON c.\"tenantId\" = t.id WHERE t.slug IN ('royal-executive','blosom');"
```
Expected: both rows present, `status = 'delivered'`.

- [ ] **Step 5: Delete the throwaway script**

```bash
rm /root/dafsolt-core/scripts/backfill-school-manager-ai-proxy-credentials.js
```

No commit needed for the deletion (the script was never committed) — confirm with `git status` in `dafsolt-core` that it shows no changes.

---

### Task 2: `CoreAiChatSyncService` — support-chat path, with tests

**Files:**
- Create: `server/src/domain/ai-chat-sync/CoreAiChatSyncService.ts`
- Create: `server/src/domain/ai-chat-sync/CoreAiChatSyncService.test.ts`
- Modify: `server/src/config/env.ts` (add the 3 new env fields this task's tests need)

**Interfaces:**
- Produces: `class CoreAiChatSyncService { supportChat(history: ChatTurn[], message: string): Promise<{ reply: string } | null> }` — `ChatTurn` imported from `../support/SupportChatService` (existing type, unchanged).
- Consumes: `env.dafsoltCoreAiChatEnabled: boolean`, `env.schoolManagerAiProxyEmail: string | undefined`, `env.schoolManagerAiProxyPassword: string | undefined` (all added in this task).

- [ ] **Step 1: Add the 3 new env fields**

In `server/src/config/env.ts`, add near the other `dafsoltCore*` fields (after `dafsoltCoreContactSyncTenants`):

```ts
  // AI Assistant consolidation into dafsolt-core — see
  // src/domain/ai-chat-sync/CoreAiChatSyncService.ts. Off unless
  // explicitly enabled; when disabled, both support-chat and
  // assistant-chat fall straight through to their existing local
  // fallback-reply text with zero network call to Core.
  dafsoltCoreAiChatEnabled: process.env.DAFSOLT_CORE_AI_CHAT_ENABLED === "true",
  // One fixed, product-level Core service account for the public
  // support-chat widget — a stateless compute proxy with zero
  // per-tenant data, must work for every school unconditionally, so
  // this is NOT one of the per-tenant credential maps above.
  schoolManagerAiProxyEmail: process.env.SCHOOL_MANAGER_AI_PROXY_EMAIL,
  schoolManagerAiProxyPassword: process.env.SCHOOL_MANAGER_AI_PROXY_PASSWORD,
```

- [ ] **Step 2: Write the failing test for the disabled-flag short-circuit**

Create `server/src/domain/ai-chat-sync/CoreAiChatSyncService.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv = {
  dafsoltCoreAiChatEnabled: false,
  schoolManagerAiProxyEmail: "ai-proxy@school-manager.dafsolt-core.internal",
  schoolManagerAiProxyPassword: "proxy-pass",
};

vi.mock("../../config/env", () => ({ env: mockEnv }));

describe("CoreAiChatSyncService.supportChat", () => {
  let originalFetch: typeof global.fetch;
  let CoreAiChatSyncService: typeof import("./CoreAiChatSyncService").CoreAiChatSyncService;

  beforeEach(async () => {
    originalFetch = global.fetch;
    vi.resetModules();
    mockEnv.dafsoltCoreAiChatEnabled = false;
    ({ CoreAiChatSyncService } = await import("./CoreAiChatSyncService"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns null without calling fetch when the feature flag is off", async () => {
    global.fetch = vi.fn();
    const service = new CoreAiChatSyncService();

    const result = await service.supportChat([], "hi");

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd server && npx vitest run src/domain/ai-chat-sync/CoreAiChatSyncService.test.ts`
Expected: FAIL — `Cannot find module './CoreAiChatSyncService'`.

- [ ] **Step 4: Write `CoreAiChatSyncService.ts`'s support-chat path**

Create `server/src/domain/ai-chat-sync/CoreAiChatSyncService.ts`:

```ts
import fs from "fs";
import path from "path";
import { env } from "../../config/env";
import { ChatTurn } from "../support/SupportChatService";

const CORE_API_BASE_URL = "https://id.dafsolt.cloud/core-api";
const REQUEST_TIMEOUT_MS = 20_000;

interface CoreTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface CoreSupportReply {
  reply: string;
}

/**
 * Proxies School Manager's support-chat and (Task 3) assistant-chat
 * widgets to dafsolt-core's hosted POST /support/chat and
 * POST /assistant/chat instead of calling Groq directly — port of
 * kitchen-erp's CoreAiChatSyncService (same design, same reasoning),
 * adapted to this repo's plain Express/fetch style.
 *
 * supportChat uses ONE fixed, product-level Core service account
 * (school-manager-ai-proxy) — this is a stateless compute proxy with
 * zero per-tenant data and must work for every school unconditionally,
 * unlike the per-tenant credential maps (dafsoltCoreHrSyncTenants etc.)
 * used elsewhere in this codebase for genuinely opt-in sync features.
 *
 * Returns null (never throws) when unconfigured, uncredentialed, or
 * Core is unreachable — the caller (SupportChatService) falls back to
 * its own existing local fallback reply either way.
 */
export class CoreAiChatSyncService {
  // supportChat's single shared-account token.
  private tokens: CoreTokens | null = null;

  async supportChat(history: ChatTurn[], message: string): Promise<CoreSupportReply | null> {
    if (!env.dafsoltCoreAiChatEnabled) return null;

    const knowledgeMarkdown = fs.readFileSync(
      path.join(__dirname, "../../ai/support-knowledge.md"),
      "utf8"
    );

    const token = await this.getAccessToken();
    if (!token) return null;

    return this.callWithToken<CoreSupportReply>(token, "/support/chat", {
      productName: "Dafsolt BOS for School",
      productDescription:
        "a complete operating system for African schools — Academics, Finance, CBT, HR, Communication, Operations and Analytics.",
      knowledgeMarkdown,
      contactPhone: env.supportContactPhone,
      contactEmail: env.supportContactEmail,
      history,
      message,
    });
  }

  private async callWithToken<T>(token: string, path: string, body: Record<string, unknown>): Promise<T | null> {
    const res = await fetch(`${CORE_API_BASE_URL}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`[core-ai-chat-sync] Core ${path} responded ${res.status}`);
      return null;
    }

    return (await res.json()) as T;
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.tokens && Date.now() < this.tokens.expiresAt) {
      return this.tokens.accessToken;
    }
    if (this.tokens) {
      const refreshed = await this.refresh(this.tokens.refreshToken);
      if (refreshed) return refreshed;
    }

    const email = env.schoolManagerAiProxyEmail;
    const password = env.schoolManagerAiProxyPassword;
    if (!email || !password) {
      console.warn("[core-ai-chat-sync] AI chat proxy credentials are not configured");
      return null;
    }
    return this.login(email, password);
  }

  private async login(email: string, password: string): Promise<string | null> {
    const res = await fetch(`${CORE_API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[core-ai-chat-sync] proxy login failed with status ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { accessToken: string; refreshToken: string };
    this.storeTokens(body.accessToken, body.refreshToken);
    return body.accessToken;
  }

  private async refresh(refreshToken: string): Promise<string | null> {
    const res = await fetch(`${CORE_API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      this.tokens = null;
      return null;
    }
    const body = (await res.json()) as { accessToken: string; refreshToken: string };
    this.storeTokens(body.accessToken, body.refreshToken);
    return body.accessToken;
  }

  private storeTokens(accessToken: string, refreshToken: string): void {
    const decoded = this.decodeJwtPayload(accessToken);
    const expiresAt = decoded?.exp ? decoded.exp * 1000 - 60_000 : Date.now() + 10 * 60_000;
    this.tokens = { accessToken, refreshToken, expiresAt };
  }

  private decodeJwtPayload(token: string): { exp?: number } | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    try {
      return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd server && npx vitest run src/domain/ai-chat-sync/CoreAiChatSyncService.test.ts`
Expected: PASS.

- [ ] **Step 6: Add tests for the login/cache/failure paths**

Append to `CoreAiChatSyncService.test.ts` (inside the same `describe` block, after the existing `it`):

```ts
  it("logs in with the proxy credentials and caches the token for a second call", async () => {
    mockEnv.dafsoltCoreAiChatEnabled = true;
    vi.resetModules();
    ({ CoreAiChatSyncService } = await import("./CoreAiChatSyncService"));

    const accessToken = `h.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.s`;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ accessToken, refreshToken: "r1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: "first" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: "second" }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new CoreAiChatSyncService();
    const first = await service.supportChat([], "hi");
    const second = await service.supportChat([], "hi again");

    expect(first).toEqual({ reply: "first" });
    expect(second).toEqual({ reply: "second" });
    const loginCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith("/auth/login"));
    expect(loginCalls.length).toBe(1);
  });

  it("returns null when the proxy credentials are not configured", async () => {
    mockEnv.dafsoltCoreAiChatEnabled = true;
    mockEnv.schoolManagerAiProxyEmail = undefined as unknown as string;
    vi.resetModules();
    ({ CoreAiChatSyncService } = await import("./CoreAiChatSyncService"));
    global.fetch = vi.fn();

    const service = new CoreAiChatSyncService();
    const result = await service.supportChat([], "hi");

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
    mockEnv.schoolManagerAiProxyEmail = "ai-proxy@school-manager.dafsolt-core.internal";
  });

  it("returns null when Core responds with a non-2xx status", async () => {
    mockEnv.dafsoltCoreAiChatEnabled = true;
    vi.resetModules();
    ({ CoreAiChatSyncService } = await import("./CoreAiChatSyncService"));

    const accessToken = `h.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.s`;
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ accessToken, refreshToken: "r1" }) })
      .mockResolvedValueOnce({ ok: false, status: 502 }) as unknown as typeof fetch;

    const service = new CoreAiChatSyncService();
    const result = await service.supportChat([], "hi");

    expect(result).toBeNull();
  });
```

- [ ] **Step 7: Run all tests in the file to verify they pass**

Run: `cd server && npx vitest run src/domain/ai-chat-sync/CoreAiChatSyncService.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 8: Commit**

```bash
git add server/src/config/env.ts server/src/domain/ai-chat-sync/CoreAiChatSyncService.ts server/src/domain/ai-chat-sync/CoreAiChatSyncService.test.ts
git commit -m "feat(ai-chat): add CoreAiChatSyncService with the support-chat path"
```

---

### Task 3: `CoreAiChatSyncService` — assistant-chat path (per-tenant), with tests

**Files:**
- Modify: `server/src/domain/ai-chat-sync/CoreAiChatSyncService.ts`
- Modify: `server/src/domain/ai-chat-sync/CoreAiChatSyncService.test.ts`

**Interfaces:**
- Consumes: `credentialsForTenantSlug(tenantSlug: string): Promise<{ email: string; password: string } | null>` from `../../modules/core-sync-credentials/core-sync-credentials.service` (existing, unmodified); `prisma.tenant.findUnique` from `../../config/prisma` (existing).
- Produces: `assistantChat(tenantId: string, summary: Record<string, unknown>, knownIds: Record<string, string[]>, actions: { name: string; label: string; route: string; idType: string | null }[], history: ChatTurn[], message: string, callerContext?: { userId: string; role: string }): Promise<{ reply: string; actions: { label: string; url: string }[] } | null>` — consumed by Task 5. `callerContext` is audit-trail-only (Core logs it as `callerAsserted*`, verified in `src/routes/assistant.js` — never read back for any authorization decision), matching Kitchen ERP's own call shape exactly.

- [ ] **Step 1: Write the failing test for the per-tenant credential lookup**

Add to `CoreAiChatSyncService.test.ts`, alongside the existing mocks at the top of the file:

```ts
const mockFindUnique = vi.fn();
vi.mock("../../config/prisma", () => ({ prisma: { tenant: { findUnique: mockFindUnique } } }));

const mockCredentialsForTenantSlug = vi.fn();
vi.mock("../../modules/core-sync-credentials/core-sync-credentials.service", () => ({
  credentialsForTenantSlug: mockCredentialsForTenantSlug,
}));
```

Add a new `describe` block at the end of the file:

```ts
describe("CoreAiChatSyncService.assistantChat", () => {
  let CoreAiChatSyncService: typeof import("./CoreAiChatSyncService").CoreAiChatSyncService;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv.dafsoltCoreAiChatEnabled = true;
    mockFindUnique.mockReset();
    mockCredentialsForTenantSlug.mockReset();
    ({ CoreAiChatSyncService } = await import("./CoreAiChatSyncService"));
  });

  it("returns null when the tenant has no delivered sync credential", async () => {
    mockFindUnique.mockResolvedValue({ id: "t1", slug: "blosom" });
    mockCredentialsForTenantSlug.mockResolvedValue(null);
    global.fetch = vi.fn();

    const service = new CoreAiChatSyncService();
    const result = await service.assistantChat("t1", {}, {}, [], [], "hi");

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("logs in with the tenant's own credential and calls /assistant/chat", async () => {
    mockFindUnique.mockResolvedValue({ id: "t1", slug: "royal-executive" });
    mockCredentialsForTenantSlug.mockResolvedValue({ email: "sync+school_manager@royal-executive.dafsolt.internal", password: "pw" });

    const accessToken = `h.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.s`;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ accessToken, refreshToken: "r1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: "hi there", actions: [] }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new CoreAiChatSyncService();
    const result = await service.assistantChat("t1", { role: "SCHOOL_ADMIN" }, {}, [], [], "hi");

    expect(result).toEqual({ reply: "hi there", actions: [] });
    const chatCall = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/assistant/chat"));
    expect(chatCall).toBeDefined();
    const sentBody = JSON.parse((chatCall as unknown as [string, { body: string }])[1].body);
    expect(sentBody.productName).toBe("Dafsolt BOS for School");
  });

  it("caches tokens per tenant, separately from other tenants", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "t1", slug: "royal-executive" }).mockResolvedValueOnce({ id: "t2", slug: "blosom" });
    mockCredentialsForTenantSlug
      .mockResolvedValueOnce({ email: "sync-t1@example.internal", password: "pw1" })
      .mockResolvedValueOnce({ email: "sync-t2@example.internal", password: "pw2" });

    const accessToken = `h.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.s`;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ accessToken, refreshToken: "r", reply: "ok", actions: [] }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new CoreAiChatSyncService();
    await service.assistantChat("t1", {}, {}, [], [], "hi");
    await service.assistantChat("t2", {}, {}, [], [], "hi");

    const loginCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith("/auth/login"));
    expect(loginCalls.length).toBe(2);
    expect(JSON.parse(loginCalls[0][1].body).email).toBe("sync-t1@example.internal");
    expect(JSON.parse(loginCalls[1][1].body).email).toBe("sync-t2@example.internal");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx vitest run src/domain/ai-chat-sync/CoreAiChatSyncService.test.ts`
Expected: FAIL — `service.assistantChat is not a function`.

- [ ] **Step 3: Implement the assistant-chat path**

In `server/src/domain/ai-chat-sync/CoreAiChatSyncService.ts`, add the new import at the top:

```ts
import { prisma } from "../../config/prisma";
import { credentialsForTenantSlug } from "../../modules/core-sync-credentials/core-sync-credentials.service";
```

Add this field alongside the existing `private tokens: CoreTokens | null = null;`:

```ts
  private readonly tokensByTenant = new Map<string, CoreTokens>();
```

Add this public method (after `supportChat`):

```ts
  async assistantChat(
    tenantId: string,
    summary: Record<string, unknown>,
    knownIds: Record<string, string[]>,
    actions: { name: string; label: string; route: string; idType: string | null }[],
    history: ChatTurn[],
    message: string,
    callerContext?: { userId: string; role: string }
  ): Promise<{ reply: string; actions: { label: string; url: string }[] } | null> {
    if (!env.dafsoltCoreAiChatEnabled) return null;

    const token = await this.getAssistantAccessToken(tenantId);
    if (!token) return null;

    return this.callWithToken(token, "/assistant/chat", {
      productName: "Dafsolt BOS for School",
      embeddedInClause: "the dashboard of a logged-in user of a school",
      dataOwnerClause: "the person you are currently talking to",
      dataScopeClause: "this user's own data",
      summary,
      knownIds,
      actions,
      history,
      message,
      ...(callerContext && { callerContext }),
    });
  }

  private async getAssistantAccessToken(tenantId: string): Promise<string | null> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return null;

    const credentials = await credentialsForTenantSlug(tenant.slug);
    if (!credentials) return null;

    const cached = this.tokensByTenant.get(tenant.slug);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.accessToken;
    }
    if (cached) {
      const refreshed = await this.refreshForTenant(tenant.slug, cached.refreshToken);
      if (refreshed) return refreshed;
    }
    return this.loginForTenant(tenant.slug, credentials);
  }

  private async loginForTenant(tenantSlug: string, credentials: { email: string; password: string }): Promise<string | null> {
    const res = await fetch(`${CORE_API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[core-ai-chat-sync] assistant login failed for tenant "${tenantSlug}" with status ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { accessToken: string; refreshToken: string };
    this.storeTenantTokens(tenantSlug, body.accessToken, body.refreshToken);
    return body.accessToken;
  }

  private async refreshForTenant(tenantSlug: string, refreshToken: string): Promise<string | null> {
    const res = await fetch(`${CORE_API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      this.tokensByTenant.delete(tenantSlug);
      return null;
    }
    const body = (await res.json()) as { accessToken: string; refreshToken: string };
    this.storeTenantTokens(tenantSlug, body.accessToken, body.refreshToken);
    return body.accessToken;
  }

  private storeTenantTokens(tenantSlug: string, accessToken: string, refreshToken: string): void {
    const decoded = this.decodeJwtPayload(accessToken);
    const expiresAt = decoded?.exp ? decoded.exp * 1000 - 60_000 : Date.now() + 10 * 60_000;
    this.tokensByTenant.set(tenantSlug, { accessToken, refreshToken, expiresAt });
  }
```

Note: `callWithToken` is generic (`callWithToken<T>`) from Task 2 — the new call site above relies on TypeScript's inference from the method's own return type annotation, so no signature change is needed there.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd server && npx vitest run src/domain/ai-chat-sync/CoreAiChatSyncService.test.ts`
Expected: PASS, 7 tests total (4 from Task 2 + 3 new).

- [ ] **Step 5: Commit**

```bash
git add server/src/domain/ai-chat-sync/CoreAiChatSyncService.ts server/src/domain/ai-chat-sync/CoreAiChatSyncService.test.ts
git commit -m "feat(ai-chat): add CoreAiChatSyncService's per-tenant assistant-chat path"
```

---

### Task 4: Wire `SupportChatService` to `CoreAiChatSyncService`

**Files:**
- Modify: `server/src/domain/support/SupportChatService.ts`

**Interfaces:**
- Consumes: `CoreAiChatSyncService.supportChat(history, message): Promise<{ reply: string } | null>` (Task 2).
- Produces: `SupportChatService.respond(history: ChatTurn[], message: string): Promise<string>` — unchanged signature, so `support.controller.ts` needs no change.

- [ ] **Step 1: Replace the direct-Groq body with a call to `CoreAiChatSyncService`**

Replace the full contents of `server/src/domain/support/SupportChatService.ts`:

```ts
import { CoreAiChatSyncService } from "../ai-chat-sync/CoreAiChatSyncService";
import { env } from "../../config/env";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY_MESSAGES = 12;

/**
 * The support chatbot's integration point — proxied through
 * dafsolt-core's hosted POST /support/chat (see CoreAiChatSyncService)
 * instead of calling Groq directly. Deliberately carries no tenant/
 * student/fee data in or out. Falls back to a local reply if Core is
 * unreachable or unconfigured, same graceful-degradation posture the
 * direct-Groq implementation always had. Mirrors
 * App\Domain\Support\SupportChatService on finance.dafsolt.cloud (still
 * on direct Groq — a separate future migration).
 */
export class SupportChatService {
  constructor(private readonly coreAiChat = new CoreAiChatSyncService()) {}

  async respond(history: ChatTurn[], message: string): Promise<string> {
    try {
      const result = await this.coreAiChat.supportChat(this.trimmedHistory(history), message);
      if (result) return result.reply;
    } catch (err) {
      console.error("Core support-chat call threw", err);
    }
    return this.fallbackReply();
  }

  /**
   * Keeps only the most recent turns — the browser is the sole holder of
   * conversation state (nothing is persisted server-side), and this just
   * bounds how much of it we forward to keep requests small and cheap.
   * Kept even though Core's own /support/chat route independently slices
   * to its last 20 turns — matches Kitchen ERP's own post-migration
   * SupportChatService exactly, which kept this same local cap.
   */
  private trimmedHistory(history: ChatTurn[]): ChatTurn[] {
    const sanitised = history.filter(
      (turn) =>
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string" &&
        turn.content.trim() !== ""
    );
    return sanitised.slice(-MAX_HISTORY_MESSAGES);
  }

  private fallbackReply(): string {
    return `Sorry — I'm having trouble answering right now. Please reach us directly at ${env.supportContactPhone} or ${env.supportContactEmail} and we'll help you out.`;
  }
}
```

- [ ] **Step 2: Check whether existing tests reference the removed Groq-call internals**

Run: `cd server && grep -rn "SupportChatService" src --include="*.test.ts"`
Expected: no results (confirmed in this plan's spec — this repo has zero existing tests for `SupportChatService`). If this search finds a test, read it and update any mock of the old `fetch`-based Groq call to instead mock `CoreAiChatSyncService.supportChat` before continuing.

- [ ] **Step 3: Build and confirm no type errors**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/domain/support/SupportChatService.ts
git commit -m "feat(ai-chat): wire SupportChatService through CoreAiChatSyncService"
```

---

### Task 5: Wire `AssistantChatService` to `CoreAiChatSyncService`

**Files:**
- Modify: `server/src/domain/assistant/AssistantChatService.ts`
- Modify: `server/src/modules/assistant/assistant.controller.ts`

**Interfaces:**
- Consumes: `CoreAiChatSyncService.assistantChat(tenantId, summary, knownIds, actions, history, message, callerContext?): Promise<{ reply: string; actions: {...}[] } | null>` (Task 3); `AssistantContext` from `../../domain/assistant/AccountContextBuilder` (existing, unmodified — has `.summary`, `.knownIds`, `.actions`).
- Produces: `AssistantChatService.respond(tenantId: string, callerUserId: string, callerRole: string, context: AssistantContext, history: ChatTurn[], message: string): Promise<AssistantReply>` — signature GAINS three leading parameters (the one caller, `assistant.controller.ts`, is updated in Step 2 below to match).

- [ ] **Step 1: Replace the direct-Groq body with a direct passthrough of Core's result**

**Verified against dafsolt-core's real route source and Kitchen ERP's actual post-migration file (not assumed):** `dafsolt-core/src/routes/assistant.js` does the ACTION-line extraction/validation itself, server-side, using the exact `actions`/`knownIds` this same request sent it — it returns an already-resolved `{ reply, actions: [{label, url}] }`. Kitchen ERP's own post-migration `AssistantChatService` (`apps/api/src/modules/assistant/assistant-chat.service.ts`) confirms the correct pattern: no client-side re-extraction step at all, a direct `if (result) return result;`. This file's old `extractActions()` method (which parsed raw `ACTION:` lines out of Groq's text) is deleted entirely, not kept — there is no raw text to parse anymore.

Replace the full contents of `server/src/domain/assistant/AssistantChatService.ts`:

```ts
import { CoreAiChatSyncService } from "../ai-chat-sync/CoreAiChatSyncService";
import { AssistantContext } from "./AccountContextBuilder";
import { ChatTurn } from "../support/SupportChatService";

export interface AssistantReply {
  reply: string;
  actions: { label: string; url: string }[];
}

/**
 * The in-app assistant's integration point — proxied through
 * dafsolt-core's hosted POST /assistant/chat (see CoreAiChatSyncService)
 * instead of calling Groq directly. AccountContextBuilder (this app's
 * own, unchanged) still computes real account context and the per-role
 * action catalog locally; only the Groq call, prompt construction, and
 * ACTION-line resolution now happen in Core.
 *
 * SECURITY BOUNDARY, UNCHANGED: the model is NEVER trusted to name a
 * record id that gets queried. Core's own extraction only ever turns a
 * suggested ACTION into a real link if both the action name and its id
 * (when required) are in the `context.actions`/`context.knownIds` THIS
 * call sent it — never anything Core caches or re-derives. A
 * hallucinated or manipulated id is silently dropped.
 */
const MAX_HISTORY_MESSAGES = 12;

export class AssistantChatService {
  constructor(private readonly coreAiChat = new CoreAiChatSyncService()) {}

  async respond(
    tenantId: string,
    callerUserId: string,
    callerRole: string,
    context: AssistantContext,
    history: ChatTurn[],
    message: string
  ): Promise<AssistantReply> {
    try {
      const result = await this.coreAiChat.assistantChat(
        tenantId,
        context.summary,
        context.knownIds,
        context.actions,
        this.trimmedHistory(history),
        message,
        { userId: callerUserId, role: callerRole }
      );
      if (result) return result;
    } catch (err) {
      console.error("Core assistant-chat call threw", err);
    }
    return { reply: this.fallbackReply(), actions: [] };
  }

  private trimmedHistory(history: ChatTurn[]): ChatTurn[] {
    const sanitised = history.filter(
      (turn) =>
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string" &&
        turn.content.trim() !== ""
    );
    return sanitised.slice(-MAX_HISTORY_MESSAGES);
  }

  private fallbackReply(): string {
    return "Sorry — I'm having trouble answering right now. Please try again in a moment.";
  }
}
```

- [ ] **Step 2: Update the controller to pass `tenantId`/`userId`/`role`**

Modify `server/src/modules/assistant/assistant.controller.ts`:

```ts
import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { AccountContextBuilder } from "../../domain/assistant/AccountContextBuilder";
import { AssistantChatService } from "../../domain/assistant/AssistantChatService";
import { assistantChatSchema } from "./assistant.schema";

const contextBuilder = new AccountContextBuilder();
const chat = new AssistantChatService();

export const respond = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const input = assistantChatSchema.parse(req.body);

  const context = await contextBuilder.build(req.auth);
  const result = await chat.respond(
    req.auth.tenantId!,
    req.auth.userId,
    req.auth.role,
    context,
    input.history ?? [],
    input.message
  );

  res.json(result);
});
```

(`req.auth.tenantId!` — non-null assertion matches `AccountContextBuilder.build()`'s own existing use of `auth.tenantId!` two lines above it in that file, so this is consistent with how this codebase already treats that field for this exact route. `req.auth.userId`/`req.auth.role` come straight off `AuthContext`, verified in `server/src/middleware/auth.ts`.)

- [ ] **Step 3: Build and confirm no type errors**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/domain/assistant/AssistantChatService.ts server/src/modules/assistant/assistant.controller.ts
git commit -m "feat(ai-chat): wire AssistantChatService through CoreAiChatSyncService"
```

---

### Task 6: Wire env vars into docker-compose, deploy, and live-verify

**Files:**
- Modify: `docker-compose.prod.yml`

**Interfaces:** none new — this task deploys and verifies Tasks 1-5's work end to end.

- [ ] **Step 1: Add the 3 new env vars to the production compose file**

In `docker-compose.prod.yml`, in the `server` service's `environment:` block, add after the existing `DAFSOLT_CORE_CONTACT_SYNC_TENANTS` line:

```yaml
      DAFSOLT_CORE_AI_CHAT_ENABLED: ${DAFSOLT_CORE_AI_CHAT_ENABLED:-false}
      SCHOOL_MANAGER_AI_PROXY_EMAIL: ${SCHOOL_MANAGER_AI_PROXY_EMAIL:-}
      SCHOOL_MANAGER_AI_PROXY_PASSWORD: ${SCHOOL_MANAGER_AI_PROXY_PASSWORD:-}
```

- [ ] **Step 2: Commit the compose change**

```bash
git add docker-compose.prod.yml
git commit -m "feat(ai-chat): add AI-chat-consolidation env vars to prod compose"
```

- [ ] **Step 3: Set the real values in production `.env` and confirm the flag stays OFF for this step**

On the VPS, in this repo's production `.env` (not committed): add `SCHOOL_MANAGER_AI_PROXY_EMAIL`/`SCHOOL_MANAGER_AI_PROXY_PASSWORD` (the values from Task 1 Step 1). Leave `DAFSOLT_CORE_AI_CHAT_ENABLED` UNSET or `false` for now — it gets turned on only after Step 6's backup and Step 7's deploy both succeed, per this plan's Global Constraints.

- [ ] **Step 4: Take a pre-deploy backup**

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U dafsolt_prod dafsolt_school > db-backups/pre-ai-chat-core-migration-deploy-$(date +%F-%H%M).sql
```

Expected: a non-trivial-sized `.sql` file appears under `db-backups/`.

- [ ] **Step 5: Build and deploy**

```bash
docker compose -f docker-compose.prod.yml up -d --build server
```

Expected: build succeeds, `dafsolt-consult-server-1` restarts healthy.

- [ ] **Step 6: Verify the flag is genuinely reaching the container, then turn it on**

```bash
docker exec dafsolt-consult-server-1 printenv DAFSOLT_CORE_AI_CHAT_ENABLED SCHOOL_MANAGER_AI_PROXY_EMAIL
```
Expected (before turning the flag on): `DAFSOLT_CORE_AI_CHAT_ENABLED` prints `false` or empty, `SCHOOL_MANAGER_AI_PROXY_EMAIL` prints the real address from Task 1. This confirms the env var actually reaches the running container (this repo's own documented recurring gap — an env var set in `.env` but never reaching the container — bit SSO/HR-sync/Notifications here before; don't skip this check).

Then set `DAFSOLT_CORE_AI_CHAT_ENABLED=true` in the production `.env` and redeploy:
```bash
docker compose -f docker-compose.prod.yml up -d server
docker exec dafsolt-consult-server-1 printenv DAFSOLT_CORE_AI_CHAT_ENABLED
```
Expected: prints `true`.

- [ ] **Step 7: Live-verify support-chat (public, unauthenticated)**

```bash
curl -s -X POST https://edu.dafsolt.cloud/api/support/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is Dafsolt BOS for School and what modules does it have?"}'
```
Expected: a real, knowledge-grounded reply mentioning Academics/Finance/CBT/HR/Communication/Operations/Analytics — not the generic fallback text ("Sorry — I'm having trouble answering right now...").

- [ ] **Step 8: Live-verify assistant-chat (authenticated, real tenant, post-backfill)**

Log in as a real `royal-executive` user (or mint a token directly with this app's own `JWT_SECRET`/payload shape if the real password is unavailable this session, same technique this project's history already used for this exact tenant) and call:

```bash
curl -s -X POST https://edu.dafsolt.cloud/api/assistant/chat \
  -H "Content-Type: application/json" -H "Authorization: Bearer <real royal-executive token>" \
  -d '{"message":"What can you tell me about this school right now?"}'
```
Expected: a real reply referencing royal-executive's actual data (not the generic fallback), and — if the role's action catalog includes at least one entry relevant to the question — a real resolved action in the response's `actions` array (confirms `validateActions()`/`extractActions()`, whichever Task 5 ended up using, correctly round-trips a real action end to end).

- [ ] **Step 9: Confirm zero regression on `blosom` and a from-scratch tenant with no credential**

Repeat Step 8 against `blosom` (also backfilled in Task 1) — expect a real reply. Then, using any School Manager tenant that predates Task 1 and was NOT backfilled (or a fresh throwaway registered now, before it goes through any sync-credential delivery), confirm assistant-chat still returns SOME reply (the local fallback text, not an error or a hang) — this proves the `null`-from-`getAssistantAccessToken` path degrades gracefully exactly as designed, not silently breaking the endpoint for a tenant with no credential.

- [ ] **Step 10: Full fleet health check**

```bash
for d in kitchen.dafsolt.cloud edu.dafsolt.cloud finance.dafsolt.cloud pms.dafsolt.cloud id.dafsolt.cloud dafsolt.cloud officialechochamber.com; do
  code=$(curl -s -o /dev/null -w "%{http_code}" https://$d/)
  echo "$d -> $code"
done
```
Expected: every domain 200 (or the same non-200 baseline it already had before this deploy, if any — compare against a pre-deploy run of the same command).

- [ ] **Step 11: Clean up any throwaway tokens/tenants created for Steps 7-9**

If Step 8/9 minted a JWT directly rather than using a real login, no cleanup is needed (no session/row was created). If any throwaway registration was used to prove Step 9's no-credential case, delete it via the established FK-ordered delete pattern for this repo's `tenants`/`users` tables.
