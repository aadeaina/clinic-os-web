import { useState } from "react";

const SAMPLES = [
  "I need to book a follow-up next week",
  "I have chest pain and shortness of breath",
  "Can you check my coverage and copay?",
  "I'm a new patient, start my intake",
];

export default function MessageComposer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");

  function send() {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a patient message…"
          className="flex-1 rounded-lg border border-line bg-elevated px-3 py-2 text-xs text-body placeholder-dim outline-none transition-colors duration-150 focus:border-teal"
        />
        <button
          onClick={send}
          className="rounded-lg bg-teal px-4 py-2 text-xs font-semibold text-surface transition-opacity hover:opacity-80 active:opacity-70"
        >
          Send
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SAMPLES.map((s) => (
          <button
            key={s}
            onClick={() => onSend(s)}
            className="rounded-full border border-line px-2.5 py-1 text-[10px] text-dim transition-colors duration-150 hover:border-teal hover:text-teal"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
