import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

export type DeliveryResult = { ok: true } | { ok: false; reason: string };

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort ?? 587,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, text: string): Promise<DeliveryResult> {
  const client = getTransporter();
  if (!client) {
    return { ok: false, reason: "SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS)" };
  }

  try {
    await client.sendMail({ from: env.smtpFrom, to, subject, text });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Unknown email delivery error" };
  }
}
