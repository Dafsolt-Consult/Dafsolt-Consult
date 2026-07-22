import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

let transporter: Transporter | null | undefined;

/** Lazily builds the SMTP transporter the first time it's needed, and
 * reuses it after that. Returns null when SMTP isn't configured, so
 * callers can fall back to whatever they were doing before (e.g. logging
 * the content) without treating that as an error. */
function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  if (!env.smtp.host) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
  });
  return transporter;
}

/** Sends a plain-text email if SMTP is configured. Returns whether it was
 * actually sent — false (not an exception) both when SMTP isn't configured
 * and when the send itself fails, so callers can fall back gracefully
 * either way instead of needing to distinguish the two. */
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const client = getTransporter();
  if (!client) return false;

  try {
    await client.sendMail({ from: env.smtp.from, to, subject, text });
    return true;
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
    return false;
  }
}
