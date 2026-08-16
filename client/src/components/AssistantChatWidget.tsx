import { FormEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface AssistantAction {
  label: string;
  url: string;
}

interface DisplayMessage extends ChatTurn {
  actions?: AssistantAction[];
}

const HISTORY_LIMIT = 20;

/**
 * Authenticated in-app assistant, mounted in AppLayout for every logged-in
 * role. Only ever sees this user's own data (server-side, see
 * server/src/domain/assistant/AccountContextBuilder.ts) and can only
 * suggest actions from a small per-role catalog — see
 * AssistantChatService's own docblock for the id-allowlist security
 * boundary. Same pattern as finance.dafsolt.cloud's assistant widget.
 */
export function AssistantChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      role: "assistant",
      content: `Hi ${user?.firstName ?? ""} — ask me about your recent activity, and I'll explain what I see or point you to the right screen.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const historyRef = useRef<ChatTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "Thinking…" }]);
    scrollToBottom();

    try {
      const { data } = await api.post<{ reply: string; actions: AssistantAction[] }>("/assistant/chat", {
        message: text,
        history: historyRef.current,
      });

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: data.reply, actions: data.actions };
        return next;
      });

      const updated: ChatTurn[] = [
        ...historyRef.current,
        { role: "user", content: text },
        { role: "assistant", content: data.reply },
      ];
      historyRef.current = updated.slice(-HISTORY_LIMIT);
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "Sorry — something went wrong. Please try again in a moment." };
        return next;
      });
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  return (
    <div className="fixed bottom-0 right-0 z-[9999] p-4 sm:p-6" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" }}>
      {open && (
        <div className="mb-3 flex h-[min(480px,calc(100vh-8rem))] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
            <span>Assistant</span>
            <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)} className="text-xl leading-none">
              &times;
            </button>
          </div>
          <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto bg-slate-100 p-3">
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    m.role === "assistant" ? "self-start border border-slate-200 bg-white text-slate-900" : "self-end bg-teal-500 text-[#06231f]"
                  }`}
                >
                  {m.content}
                </div>
                {m.actions && m.actions.length > 0 && (
                  <div className="flex max-w-[88%] flex-col gap-1 self-start">
                    {m.actions.map((action) => (
                      <Link
                        key={action.url + action.label}
                        to={action.url}
                        onClick={() => setOpen(false)}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white"
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 bg-white p-3">
            <textarea
              rows={1}
              maxLength={2000}
              required
              placeholder="Ask about your account…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.currentTarget.form as HTMLFormElement)?.requestSubmit();
                }
              }}
              className="max-h-24 flex-1 resize-none rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
            />
            <button type="submit" disabled={sending} aria-label="Send" className="w-10 shrink-0 rounded-lg bg-slate-900 text-white disabled:opacity-50">
              &#10148;
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        aria-label="Open assistant"
        onClick={() => setOpen((o) => !o)}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 text-2xl text-[#06231f] shadow-lg"
      >
        &#128172;
      </button>
    </div>
  );
}
