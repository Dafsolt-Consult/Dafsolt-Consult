import fs from "fs";
import path from "path";
import { env } from "../../config/env";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY_MESSAGES = 12;

/**
 * The support chatbot's only integration point with Groq. Deliberately
 * carries no tenant/student/fee data in or out — its entire context is the
 * static knowledge doc below plus whatever the visitor types, so there is
 * nothing sensitive for a prompt-injection attempt to exfiltrate. Answering
 * a specific school's real data is explicitly out of scope; see the
 * knowledge doc's own closing section. Mirrors
 * App\Domain\Support\SupportChatService on finance.dafsolt.cloud.
 */
export class SupportChatService {
  async respond(history: ChatTurn[], message: string): Promise<string> {
    try {
      const response = await fetch(`${env.groqBaseUri}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.groqApiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          model: env.groqModel,
          temperature: 0.4,
          max_tokens: 600,
          messages: [
            { role: "system", content: this.systemPrompt() },
            ...this.trimmedHistory(history),
            { role: "user", content: message },
          ],
        }),
      });

      if (!response.ok) {
        console.error("Groq support-chat request failed", {
          status: response.status,
          body: await response.text(),
        });
        return this.fallbackReply();
      }

      const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const reply = data?.choices?.[0]?.message?.content;

      if (typeof reply !== "string" || reply.trim() === "") {
        throw new Error("Groq response had no usable reply content.");
      }

      return reply;
    } catch (err) {
      console.error("Groq support-chat call threw", err);
      return this.fallbackReply();
    }
  }

  /**
   * Keeps only the most recent turns — the browser is the sole holder of
   * conversation state (nothing is persisted server-side), and this just
   * bounds how much of it we forward to keep requests small and cheap.
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

  private systemPrompt(): string {
    const knowledge = fs.readFileSync(path.join(__dirname, "../../ai/support-knowledge.md"), "utf8");
    const phone = env.supportContactPhone;
    const email = env.supportContactEmail;

    return `You are the support assistant for Dafsolt BOS for School, a complete
operating system for African schools — Academics, Finance, CBT, HR,
Communication, Operations and Analytics, all connected in one place.

Speak like a helpful, competent colleague — warm, plain language, no
corporate filler, no "As an AI language model" disclaimers, no unnecessary
hedging. Keep answers concise: a short paragraph or a tight list, not an
essay. Ask a clarifying question if the visitor's question is genuinely
ambiguous, rather than guessing.

Answer ONLY using the knowledge below. It describes how this application
works. Do not invent features, numbers, or behavior that isn't in it.

If you don't know the answer, or the visitor asks to speak to a person, say
so plainly and give them these contact details:
Phone: ${phone}
Email: ${email}

--- KNOWLEDGE ---
${knowledge}
--- END KNOWLEDGE ---`;
  }

  private fallbackReply(): string {
    return `Sorry — I'm having trouble answering right now. Please reach us directly at ${env.supportContactPhone} or ${env.supportContactEmail} and we'll help you out.`;
  }
}
