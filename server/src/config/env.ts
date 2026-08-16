import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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

  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 20),

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
};

export const isProd = env.nodeEnv === "production";
