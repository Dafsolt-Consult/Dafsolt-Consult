import { env } from "../../config/env";
import { AssistantAction, AssistantContext } from "./AccountContextBuilder";
import { ChatTurn } from "../support/SupportChatService";

const MAX_HISTORY_MESSAGES = 12;

export interface AssistantReply {
  reply: string;
  actions: { label: string; url: string }[];
}

/**
 * The in-app assistant's only integration point with Groq — same provider
 * and call shape as SupportChatService, but with two things that service
 * deliberately has neither of: real account context, and the ability to
 * point the user at an action. Mirrors
 * App\Domain\Assistant\AssistantChatService on finance.dafsolt.cloud.
 *
 * SECURITY BOUNDARY: the model is NEVER trusted to name a record id that
 * gets queried. AccountContextBuilder pre-computes 'knownIds' — the exact
 * set of ids already shown to the user in their own context — and
 * extractActions() below only ever turns a suggested ACTION into a real
 * link if both the action name and its id (when one is required) already
 * appear in that set. A hallucinated or manipulated id is silently
 * dropped, never re-queried. Likewise the model can only ever suggest an
 * action from the small per-role catalog AccountContextBuilder built — it
 * cannot invent a new one, and every link it does produce is a client-side
 * navigation path, not a state-changing API call.
 */
export class AssistantChatService {
  async respond(context: AssistantContext, history: ChatTurn[], message: string): Promise<AssistantReply> {
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
          temperature: 0.2,
          max_tokens: 500,
          messages: [
            { role: "system", content: this.systemPrompt(context) },
            ...this.trimmedHistory(history),
            { role: "user", content: message },
          ],
        }),
      });

      if (!response.ok) {
        console.error("Groq assistant-chat request failed", {
          status: response.status,
          body: await response.text(),
        });
        return { reply: this.fallbackReply(), actions: [] };
      }

      const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const reply = data?.choices?.[0]?.message?.content;

      if (typeof reply !== "string" || reply.trim() === "") {
        throw new Error("Groq response had no usable reply content.");
      }

      return this.extractActions(reply, context);
    } catch (err) {
      console.error("Groq assistant-chat call threw", err);
      return { reply: this.fallbackReply(), actions: [] };
    }
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

  /**
   * Pulls trailing `ACTION: name` / `ACTION: name:id` lines off the raw
   * reply, validates each against the catalog and known-id set the
   * context was built with, and turns anything that survives into a real,
   * clickable link. Everything else — an unknown action name, an id not in
   * knownIds, a required id that's missing — is silently dropped: the
   * displayed text is stripped of the tag either way, so a rejected
   * suggestion just quietly doesn't produce a button rather than surfacing
   * a broken one.
   */
  private extractActions(reply: string, context: AssistantContext): AssistantReply {
    const catalog = new Map<string, AssistantAction>(context.actions.map((a) => [a.name, a]));
    const actions: { label: string; url: string }[] = [];
    const kept: string[] = [];

    for (const line of reply.split("\n")) {
      const match = /^\s*ACTION:\s*([a-z_]+)(?::(\S+))?\s*$/i.exec(line);
      if (!match) {
        kept.push(line);
        continue;
      }

      const [, name, id] = match;
      const entry = catalog.get(name);
      if (!entry) continue;

      if (entry.idType === null) {
        actions.push({ label: entry.label, url: entry.route });
        continue;
      }

      if (!id || !(context.knownIds[entry.idType] ?? []).includes(id)) continue;

      actions.push({ label: entry.label, url: entry.route });
    }

    return { reply: kept.join("\n").trim(), actions };
  }

  private systemPrompt(context: AssistantContext): string {
    const summary = JSON.stringify(context.summary, null, 2);

    const actionLines = context.actions
      .map((a) =>
        a.idType === null
          ? `- ${a.name} — ${a.label} (no id)`
          : `- ${a.name}:<id from the matching list above> — ${a.label}`
      )
      .join("\n");

    return `You are the in-app assistant for Dafsolt BOS for School, embedded in the
dashboard of a logged-in user of a school.

Speak like a helpful, competent colleague — warm, plain language, no
corporate filler, no "As an AI language model" disclaimers. Keep answers
concise: a short paragraph or a tight list, not an essay.

You may ONLY discuss the data below, which belongs to the person you are
currently talking to. You have no access to any other user's, class's, or
school's data, and must say so plainly if asked about anything outside
this. Never invent a figure, status, or record that isn't in this data.

--- THIS USER'S DATA ---
${summary}
--- END DATA ---

If (and only if) one of the actions below would genuinely help, offer it in
one short sentence, then end your reply with the matching line in EXACTLY
this format (nothing else on that line, one per action, using an id copied
verbatim from the data above — never a made-up one):

ACTION: name
ACTION: name:id

Available actions for this user's role:
${actionLines || "(none)"}

Never claim to have performed an action yourself — the ACTION line
produces a button the user clicks; you are only suggesting it. Never emit
an ACTION line for anything not in this exact list.`;
  }

  private fallbackReply(): string {
    return "Sorry — I'm having trouble answering right now. Please try again in a moment.";
  }
}
