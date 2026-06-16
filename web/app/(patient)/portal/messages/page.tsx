"use client";
import { useState, useRef, useEffect } from "react";
import { streamSession } from "@/lib/api";

const CLINIC = "00000000-0000-0000-0000-000000000000";
const PATIENT_REF = "usr-6";

interface Message {
  id:      string;
  from:    "patient" | "ai";
  text:    string;
  time:    string;
  typing?: boolean;
}

const QUICK_QUESTIONS = [
  "What should I do to prepare for my next appointment?",
  "I'd like to request a prescription refill.",
  "Can I get a referral to a specialist?",
  "I have a question about my recent lab results.",
];

export default function PatientMessages() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [busy, setBusy]           = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addAITyping(): string {
    const id = `ai-${Date.now()}`;
    setMessages((prev) => [...prev, { id, from: "ai", text: "", time: now(), typing: true }]);
    return id;
  }

  function updateAIMessage(id: string, text: string, done = false) {
    setMessages((prev) =>
      prev.map((m) => m.id === id ? { ...m, text, typing: !done } : m)
    );
  }

  function now() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setInput("");
    setBusy(true);

    setMessages((prev) => [...prev, { id: `pt-${Date.now()}`, from: "patient", text, time: now() }]);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: CLINIC, channel: "web", patient_ref: PATIENT_REF, text }),
      });
      if (!res.ok) throw new Error("Failed");
      const { session_id } = await res.json() as { session_id: string };

      const aiId = addAITyping();
      streamSession(
        session_id,
        (step) => {
          if (step.type === "agent_msg" && step.text) {
            updateAIMessage(aiId, step.text);
          }
          if (step.type === "final" && step.text) {
            updateAIMessage(aiId, step.text, true);
          }
          if (step.type === "escalate") {
            updateAIMessage(aiId, "Your message has been forwarded to your care team. A staff member will follow up with you shortly.", true);
          }
        },
        () => { setBusy(false); updateAIMessage(aiId, messages.find((m) => m.id === aiId)?.text ?? "I'm here to help. How can I assist you today?", true); }
      );
    } catch {
      setBusy(false);
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, from: "ai", text: "I'm temporarily unavailable. Please try again or call the clinic directly.", time: now() }]);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px - 48px)" }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-body">Messages</h1>
          <p className="text-xs text-dim mt-0.5">Powered by Riverside Medical AI · Secure & private</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="pulse-dot" />
          <span className="text-xs" style={{ color: "var(--accent)" }}>AI available</span>
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-line bg-card p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div>
              <div className="text-3xl mb-2">💬</div>
              <div className="text-sm font-semibold text-body">How can we help you today?</div>
              <div className="text-xs text-dim mt-1">Our AI assistant can answer questions and connect you with your care team.</div>
            </div>
            <div className="w-full max-w-sm space-y-2">
              {QUICK_QUESTIONS.map((q) => (
                <button key={q} onClick={() => send(q)}
                  className="w-full rounded-xl border border-line bg-elevated px-4 py-2.5 text-left text-xs text-dim2 transition-colors hover:border-line2 hover:text-body">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === "patient" ? "justify-end" : "justify-start"}`}>
            {m.from === "ai" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-surface mr-2 mt-1"
                style={{ background: "var(--accent)" }}>AI</div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
              m.from === "patient"
                ? "rounded-tr-sm text-surface"
                : "rounded-tl-sm border border-line bg-elevated text-body"
              }`}
              style={m.from === "patient" ? { background: "var(--accent)" } : {}}
            >
              {m.typing ? (
                <div className="flex gap-1 items-center py-0.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-dim animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{m.text}</p>
              )}
              <p className={`mt-1 text-[9px] ${m.from === "patient" ? "text-surface/60" : "text-dim"}`}>{m.time}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send(input))}
          disabled={busy}
          placeholder="Type your message…"
          className="flex-1 rounded-xl border border-line bg-card px-4 py-3 text-sm text-body placeholder-dim outline-none transition-colors focus:border-teal disabled:opacity-50"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || busy}
          className="rounded-xl px-5 py-3 text-sm font-semibold text-surface transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          Send
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] text-dim">
        This AI assistant does not replace medical advice. For emergencies call 911 or go to the nearest ER.
      </p>
    </div>
  );
}
