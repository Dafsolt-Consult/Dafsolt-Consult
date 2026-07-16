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
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? "7d",

  superAdminEmail: process.env.SUPER_ADMIN_EMAIL ?? "platform@dafsolt.com",
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD ?? "ChangeMe123!",

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
  smtpFrom: process.env.SMTP_FROM ?? "School Manager <no-reply@dafsolt.com>",

  africasTalkingApiKey: process.env.AFRICASTALKING_API_KEY,
  africasTalkingUsername: process.env.AFRICASTALKING_USERNAME,
};

export const isProd = env.nodeEnv === "production";
