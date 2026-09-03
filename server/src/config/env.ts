import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

interface TenantCredentials {
  email: string;
  password: string;
}

// Malformed/unset input silently resolves to {} — dafsoltCoreHrSyncEnabled
// still gates the whole feature, so an empty map here just means every
// tenant is a no-op, not a boot-time crash.
function parseTenantCredentialsMap(name: string): Record<string, TenantCredentials> {
  const raw = process.env[name];
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, TenantCredentials>;
  } catch {
    console.warn(`[env] ${name} is not valid JSON — ignoring`);
    return {};
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",

  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  // Separate signing secret for platform-admin tokens (src/utils/platformJwt.ts)
  // so a leaked tenant secret can't forge a platform token, or vice versa.
  jwtPlatformSecret: required("JWT_PLATFORM_SECRET"),
  // Same isolation, for the CBT exam-hall kiosk login (src/utils/kioskJwt.ts)
  // — a supervised, name+admission-number "login" that must never be able
  // to reach anything but exam-taking, even if this secret ever leaked.
  jwtKioskSecret: required("JWT_KIOSK_SECRET"),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? "7d",
  // Short — a kiosk session covers one supervised sitting, not a persistent
  // account. No refresh token: re-login is cheap and expected here.
  jwtKioskTtl: process.env.JWT_KIOSK_TTL ?? "4h",

  // Bootstrap credentials for the first PlatformAdmin (role OWNER), created
  // once by bootstrap.ts if the platform_admins table is empty. No fallback
  // password — if unset, bootstrap silently skips instead of creating an
  // account with a guessable default (see bootstrap.ts).
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL,
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD,

  // Real email/SMS delivery — optional. When unset, sendEmail/sendSms
  // (src/utils/email.ts, src/utils/sms.ts) return a FAILED result with a
  // clear reason instead of throwing, so the rest of the app keeps working
  // with in-app notifications only until these are configured.
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM ?? "Dafsolt BOS <no-reply@dafsolt.com>",

  africasTalkingApiKey: process.env.AFRICASTALKING_API_KEY,
  africasTalkingUsername: process.env.AFRICASTALKING_USERNAME,

  // Groq's OpenAI-compatible chat-completions API — powers the public
  // support chatbot and the in-app assistant (src/domain/support,
  // src/domain/assistant). Same provider/pattern as finance.dafsolt.cloud.
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  groqBaseUri: process.env.GROQ_BASE_URI ?? "https://api.groq.com/openai/v1",

  supportContactPhone: process.env.SUPPORT_CONTACT_PHONE ?? "+2348160116571",
  supportContactEmail: process.env.SUPPORT_CONTACT_EMAIL ?? "support@dafsolt.cloud",

  // dafsolt.cloud backoffice's cross-product Monitor page — see
  // src/modules/monitor. Both unset in local/staging; the scheduler job
  // silently no-ops then.
  monitorReportUrl: process.env.MONITOR_REPORT_URL,
  monitorReportToken: process.env.MONITOR_REPORT_TOKEN,

  // dafsolt-core (id.dafsolt.cloud) SSO pilot — see src/modules/sso.
  // Additive alternate login path, off unless explicitly enabled; when
  // disabled, POST /api/sso/callback behaves as if the route doesn't exist.
  dafsoltCoreSsoEnabled: process.env.DAFSOLT_CORE_SSO_ENABLED === "true",

  // Outbound sync of staff into dafsolt-core's shared Employment record
  // (E4 pilot -> E6 full rollout) — see src/modules/hr-sync. Off unless
  // explicitly enabled. DAFSOLT_CORE_HR_SYNC_TENANTS is a JSON map of
  // { [tenantSlug]: { email, password } } — one dedicated non-human Core
  // user per enrolled tenant, never a real person's login. A tenant not
  // present in the map is a silent no-op.
  dafsoltCoreHrSyncEnabled: process.env.DAFSOLT_CORE_HR_SYNC_ENABLED === "true",
  dafsoltCoreHrSyncTenants: parseTenantCredentialsMap("DAFSOLT_CORE_HR_SYNC_TENANTS"),

  // Outbound welcome-email notifications via Core's Phase N
  // `POST /notifications` — see src/modules/notifications-sync. Reuses
  // dafsoltCoreHrSyncTenants above (same per-tenant Core sync user),
  // toggled independently via its own flag.
  dafsoltCoreNotifyEnabled: process.env.DAFSOLT_CORE_NOTIFY_ENABLED === "true",

  // Outbound Fee invoice/payment sync into Core's General Ledger — see
  // src/modules/ledger-sync (second pilot of that primitive, after
  // PMS's Folio). DELIBERATELY its own, narrower credential map, not
  // dafsoltCoreHrSyncTenants above: that map already includes
  // royal-executive (real student/fee data), which needs its own
  // separate go-ahead before real money-adjacent postings start —
  // ledger-sync.service.ts's own docblock has the full reasoning.
  dafsoltCoreLedgerSyncEnabled: process.env.DAFSOLT_CORE_LEDGER_SYNC_ENABLED === "true",
  dafsoltCoreLedgerSyncTenants: parseTenantCredentialsMap("DAFSOLT_CORE_LEDGER_SYNC_TENANTS"),

  // Outbound Student/Guardian sync into Core's Contact primitive — see
  // src/modules/contact-sync (first pilot of that primitive; Core's own
  // schema comment names PMS's Guest, School Manager's Student+Guardian,
  // and TradeLoan's Member as the three candidates it was built for).
  // Own, narrower credential map, same reasoning as
  // dafsoltCoreLedgerSyncTenants above and NOT dafsoltCoreHrSyncTenants:
  // that map already includes royal-executive (real student/guardian
  // PII), which needs its own separate go-ahead before this pilot
  // extends past the empty trial tenant "blosom".
  dafsoltCoreContactSyncEnabled: process.env.DAFSOLT_CORE_CONTACT_SYNC_ENABLED === "true",
  dafsoltCoreContactSyncTenants: parseTenantCredentialsMap("DAFSOLT_CORE_CONTACT_SYNC_TENANTS"),

  // AES-256-GCM key (base64 of exactly 32 raw bytes) encrypting delivered
  // Core sync credentials at rest — see src/utils/secret-box.ts and
  // src/modules/core-sync-credentials (2026-08-26 port). secret-box reads
  // process.env directly rather than this object, deliberately: a missing
  // or malformed key must fail CLOSED at receive time and degrade to "no
  // sync" at resolution time, never crash boot.
  coreSyncCredentialKey: process.env.CORE_SYNC_CREDENTIAL_KEY,
};

export const isProd = env.nodeEnv === "production";
