import { FormEvent, useRef, useState } from "react";
import { api } from "../api/client";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const HISTORY_LIMIT = 20;

/**
 * Public landing-page support chatbot. Mounted only on LandingPage — never
 * touches tenant/student/fee data, its whole context is a static knowledge
 * doc on the server (see server/src/domain/support/SupportChatService.ts).
 * Same pattern as finance.dafsolt.cloud's support-chat widget.
 */
export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      role: "assistant",
      content:
        "Hi! Ask me anything about how Dafsolt BOS for School works — academics, fees, CBT, whatever you need.",
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
      const { data } = await api.post<{ reply: string }>("/support/chat", {
        message: text,
        history: historyRef.current,
      });

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: data.reply };
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
        next[next.length - 1] = {
          role: "assistant",
          content: "Sorry — something went wrong reaching support. Please try again in a moment, or contact us directly.",
        };
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
        <div className="mb-3 flex h-[min(460px,calc(100vh-8rem))] w-[min(340px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-[#2E3192] px-4 py-3 text-sm font-semibold text-white">
            <span>Support</span>
            <button type="button" aria-label="Close support chat" onClick={() => setOpen(false)} className="text-xl leading-none">
              &times;
            </button>
          </div>
          <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto bg-slate-50 p-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === "assistant" ? "self-start border border-slate-200 bg-white text-slate-900" : "self-end bg-[#b9873a] text-[#1a1203]"
                }`}
              >
                {m.content}
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 bg-white p-3">
            <textarea
              rows={1}
              maxLength={2000}
              required
              placeholder="Type a question…"
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
            <button
              type="submit"
              disabled={sending}
              aria-label="Send"
              className="w-10 shrink-0 rounded-lg bg-[#2E3192] text-white disabled:opacity-50"
            >
              &#10148;
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        aria-label="Open support chat"
        onClick={() => setOpen((o) => !o)}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#2E3192] text-2xl text-white shadow-lg"
      >
        &#128172;
      </button>
    </div>
  );
}
