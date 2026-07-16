import { env } from "../config/env";
import { DeliveryResult } from "./email";

const AFRICASTALKING_SMS_URL = "https://api.africastalking.com/version1/messaging";

export async function sendSms(to: string, message: string): Promise<DeliveryResult> {
  if (!env.africasTalkingApiKey || !env.africasTalkingUsername) {
    return { ok: false, reason: "Africa's Talking is not configured (set AFRICASTALKING_API_KEY/AFRICASTALKING_USERNAME)" };
  }

  try {
    const response = await fetch(AFRICASTALKING_SMS_URL, {
      method: "POST",
      headers: {
        apiKey: env.africasTalkingApiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({ username: env.africasTalkingUsername, to, message }),
    });

    if (!response.ok) {
      return { ok: false, reason: `Africa's Talking responded with HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Unknown SMS delivery error" };
  }
}
