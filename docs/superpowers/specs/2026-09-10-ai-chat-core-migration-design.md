# School Manager: AI Chat Consolidation into dafsolt-core

**Goal:** Close DBOS Core module #6 (Communication & Collaboration)'s last
open item — migrate School Manager's independently-built support-chat and
in-app assistant off their own direct Groq calls, onto dafsolt-core's
already-hosted `POST /support/chat` and `POST /assistant/chat`, exactly
mirroring the design Kitchen ERP already proved as the pilot (DBOS Core
Platformization Gate, Phase P6).

**Why now:** Notifications is already Core-hosted for all 4 products. AI
Assistant consolidation only ever migrated Kitchen ERP as its pilot —
TradeLoan, School Manager, and PMS still each run a byte-identical,
independently-built Groq-calling implementation. This is the first of
those three follow-on migrations (School Manager chosen first: it, like
PMS, already has the `core-sync-credentials` receiver Kitchen ERP itself
uses — TradeLoan does not, and is out of scope for this round).

**Non-goals:** TradeLoan and PMS migrations (separate future rounds, each
needing its own go-ahead). Any change to `AccountContextBuilder`'s
per-role data logic (stays completely local, same as Kitchen ERP's did).
Any change to the ACTION-line security boundary (id-allowlist validation
stays in this repo, unchanged).

## Current state (verified against code, not assumed)

- `server/src/domain/support/SupportChatService.ts`: calls
  `https://api.groq.com/openai/v1/chat/completions` directly, system
  prompt built from `server/src/ai/support-knowledge.md` +
  `env.supportContactPhone/Email`. No tenant data.
- `server/src/domain/assistant/AssistantChatService.ts`: same Groq call
  shape, system prompt built from `AccountContextBuilder`'s per-role
  summary/actions/knownIds. Owns the ACTION-line extraction/validation —
  this logic is NOT proxied to Core (Core's `/assistant/chat` route
  builds its own ACTION-line prompt instructions but the actual
  extraction/validation against `knownIds` happens in the calling
  product's code, matching Kitchen ERP's `AssistantChatService` doing the
  same after its own migration).
- `server/src/modules/support/support.controller.ts` /
  `server/src/modules/assistant/assistant.controller.ts`: thin Express
  handlers, `assistant` requires `req.auth` (has `.tenantId`).
- `server/src/modules/core-sync-credentials/`: already a full port of
  Kitchen ERP's own module (JWKS-verify, `receiveSyncCredential`,
  `credentialsForTenantSlug`), already used by `ledger-sync`/`hr-sync`/
  `notifications-sync`. Reused as-is, not modified.
- Production check (2026-09-10): `royal-executive` and `blosom` (School
  Manager's only sync-enrolled tenants) have **no** `core_sync_credentials`
  row. dafsolt-core's `SCHOOL_MANAGER_SYNC_CREDENTIAL_URL` is configured
  and the receiver works (proven by PMS/Kitchen ERP using the identical
  code), but `provisionModules()`'s batch job only processes
  `TenantModule` rows with `status: requested|retrying` — both these
  tenants are already `active`, so they were never automatically
  delivered a credential. **Confirmed user decision: backfill both
  before cutover** (Task 1 below), not migrate-and-accept-the-gap.

## Design

### Component: `CoreAiChatSyncService.ts` (new)

Direct port of Kitchen ERP's `core-ai-chat-sync.service.ts`, adapted to
this repo's plain Express/fetch style (no NestJS DI):

- `supportChat(history, message): Promise<{reply: string} | null>` — POSTs
  to Core's `/support/chat` using ONE fixed, product-level Core service
  account (new Core tenant `school-manager-ai-proxy`, registered once,
  credentials in `SCHOOL_MANAGER_AI_PROXY_EMAIL`/`_PASSWORD` env vars —
  same rationale as Kitchen ERP's `kitchen-erp-ai-proxy`: this is a
  stateless compute proxy with zero per-tenant data, must work for every
  school unconditionally, not an opt-in sync feature). Sends
  `productName: "Dafsolt BOS for School"`, `productDescription`,
  `knowledgeMarkdown` (read from the existing `support-knowledge.md`,
  unchanged), `contactPhone`/`contactEmail` (from existing `env.*`).
- `assistantChat(tenantId, summary, knownIds, actions, history, message): Promise<{reply, actions} | null>`
  — POSTs to Core's `/assistant/chat` using the PER-TENANT credential
  from `credentialsForTenantSlug()` (existing `core-sync-credentials`
  module). Returns `null` if no credential exists for the tenant (same
  graceful-degradation contract as Kitchen ERP) — after Task 1's backfill,
  this only affects a school that hasn't been sync-enrolled at all, which
  today means every school EXCEPT royal-executive/blosom already gets
  this behavior for Ledger/HR/Notifications sync, so it's a pattern this
  codebase already lives with, not a new risk class.
- Both methods gated behind a new `DAFSOLT_CORE_AI_CHAT_ENABLED` env
  flag (mirrors Kitchen ERP's own flag) — defaults unset/disabled, so
  deploying the code changes nothing until explicitly turned on in
  production, giving a clean rollback lever independent of a code
  revert.
- Token caching: one process-lifetime token for the shared support-chat
  account; a small `Map<tenantSlug, CoreTokens>` for assistant-chat,
  identical structure to `ledger-sync.service.ts`'s own
  `tokensByTenant` (duplicated, not shared — same blast-radius-isolation
  rationale every sync service in this fleet already follows).

### `SupportChatService`/`AssistantChatService` become thin wrappers

Each keeps its own public `respond()` signature (no controller changes
needed beyond the constructor). Internally: try
`CoreAiChatSyncService`'s method; on a non-null result, return it; on
`null` (Core disabled/unreachable/uncredentialed) OR a thrown error, fall
back to **the exact same local fallback-reply text these services
already return today** — zero behavior change in the failure path,
matching Kitchen ERP's own "same graceful-degradation posture" design.

`AssistantChatService` keeps its `extractActions()` method unchanged —
Core's reply still carries `ACTION:` lines in the same format, validated
against `context.knownIds` exactly as today.

### What gets deleted

The direct-Groq `fetch()` call and `systemPrompt()` builder in both
services. `env.groqApiKey`/`groqModel`/`groqBaseUri` become unused by
this feature — left in `env.ts` rather than removed in this round (a
separate cleanup decision, since removing a config key touches
deployment `.env` files independently of this change's risk surface).

### Task 1 (prerequisite, before any code changes): backfill credentials

A one-off script (run once against production, deleted after, same
"throwaway script in the docroot" pattern this codebase already uses for
its no-tinker-equivalent maintenance tasks) calling dafsolt-core's
existing `createSyncCredential`/`deliverSyncCredential` functions
directly for `royal-executive` and `blosom`'s `SCHOOL_MANAGER`
`TenantModule` rows — the exact same functions `provisionModules()`
already calls for newly-provisioned tenants, just invoked for these 2
specific already-active rows instead of waiting for a batch that will
never pick them up. Verified after: both tenants' `core_sync_credentials`
row exists with `status: 'delivered'`.

## Error handling

- Core unreachable/disabled/wrong credentials → `null` → existing local
  fallback text. No new user-facing error states.
- `DAFSOLT_CORE_AI_CHAT_ENABLED` unset → both methods short-circuit to
  `null` immediately (no network call at all) — same "inert until
  explicitly turned on" pattern as Kitchen ERP's rollout.
- Malformed/missing Core response → treated as `null`, same fallback.

## Testing

- Unit tests for `CoreAiChatSyncService` (token cache, per-tenant cache
  isolation, disabled-flag short-circuit, null-on-uncredentialed,
  null-on-non-2xx) — port of Kitchen ERP's own
  `core-ai-chat-sync.service.spec.ts` test list, adapted to this repo's
  Vitest setup.
- `SupportChatService`/`AssistantChatService` existing tests (if any)
  updated for the new internal call path; controller tests unchanged
  (same request/response shape).
- Live verification (both endpoints) against real production, same bar
  as every other Core-sync rollout in this project's history: a real
  `POST /api/support/chat` returns a School-Manager-knowledge-grounded
  answer; a real authenticated `POST /api/assistant/chat` as
  royal-executive (post-backfill) returns a real answer using its actual
  data and correctly resolves an ACTION line.

## Self-review

- **Placeholder scan**: no TBD/TODO; every design decision above has a
  concrete mechanism, not a "figure this out later."
- **Scope check**: single product, both chat surfaces, one prerequisite
  task — fits one implementation plan.
- **Ambiguity check**: the "backfill vs. accept the gap" decision was
  the one genuinely two-way fork; resolved via explicit user confirmation
  (backfill first), recorded above as the current design, not left open.
