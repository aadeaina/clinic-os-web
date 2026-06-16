"use client";
import { useState } from "react";
import { useConsole } from "@/lib/store";
import { postEvent, streamSession, confirmAction } from "@/lib/api";
import MessageComposer from "@/components/MessageComposer";
import ConversationTimeline from "@/components/ConversationTimeline";
import PendingActionBar from "@/components/PendingActionBar";
import { intentLabel } from "@/lib/intents";

const CLINIC = "00000000-0000-0000-0000-000000000000";

const CHANNELS = ["web", "phone", "sms"] as const;
type Channel = (typeof CHANNELS)[number];

const SAMPLES = [
  "I need to reschedule my appointment with Dr. Chen for next week.",
  "What documents do I need to bring for my first visit?",
  "My chest has been hurting on and off — should I come in today?",
  "I received a bill for $340 but I thought my insurance covered it.",
  "What are your clinic hours on Saturday?",
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim2">{children}</div>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] text-dim shrink-0">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export default function ConsolePage() {
  const { sessionId, steps, pending, reset, setSession, addStep, clearPending } = useConsole();

  const [patientRef, setPatientRef] = useState("PT-0001");
  const [channel,    setChannel]    = useState<Channel>("web");
  const [sessionStart, setSessionStart] = useState<Date | null>(null);

  async function send(text: string) {
    reset();
    setSessionStart(new Date());
    const { session_id } = await postEvent({
      clinic_id: CLINIC, channel, patient_ref: patientRef, text,
    });
    setSession(session_id);
    streamSession(session_id, addStep, () => {});
  }

  async function confirm() {
    if (!sessionId || !pending?.action_id) return;
    const { steps: more } = await confirmAction(sessionId, pending.action_id);
    more.forEach(addStep);
    clearPending();
  }

  const routing    = steps.find((s) => s.type === "routing");
  const intent     = routing?.decision?.intent;
  const isUrgent   = routing?.decision?.urgent;
  const finalStep  = steps.find((s) => s.type === "final" || s.type === "escalate");
  const toolCalls  = steps.filter((s) => s.type === "tool_use");

  const statusLabel = !sessionId
    ? null
    : finalStep?.type === "escalate" ? "escalated"
    : finalStep?.type === "final"    ? "contained"
    : "active";

  const STATUS_STYLE: Record<string, string> = {
    escalated: "bg-[rgba(239,68,68,0.12)] text-danger border border-[rgba(239,68,68,0.28)]",
    contained: "bg-[rgba(20,184,166,0.12)] text-teal  border border-[rgba(20,184,166,0.28)]",
    active:    "bg-[rgba(245,158,11,0.10)] text-warn  border border-[rgba(245,158,11,0.26)]",
  };

  // Derive a human-readable summary of what the pending action will do
  const pendingDesc = pending
    ? (pending.action_id?.startsWith("book")
        ? "Book appointment"
        : pending.action_id?.startsWith("update")
        ? "Update patient record"
        : "Write action")
    : null;

  return (
    <div className="flex gap-4" style={{ height: "calc(100dvh - 40px - 32px)" }}>

      {/* ── Left: conversation ──────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 min-w-0">
        <SectionLabel>AI Patient Console</SectionLabel>

        <div className="flex-1 overflow-y-auto rounded-lg border border-line bg-card p-3">
          {steps.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <p className="text-xs text-dim">Type a patient message or pick a sample scenario:</p>
              <div className="w-full max-w-sm space-y-1.5">
                {SAMPLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-left text-[11px] text-dim2 transition-colors hover:border-line2 hover:text-body"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ConversationTimeline steps={steps} />
          )}
        </div>

        {pending && (
          <PendingActionBar pending={pending} onConfirm={confirm} onDiscard={clearPending} />
        )}

        <MessageComposer onSend={send} />
      </div>

      {/* ── Right: session context ──────────────────────────── */}
      <div className="w-[220px] shrink-0 flex flex-col gap-3">
        <SectionLabel>Session context</SectionLabel>

        {/* Input config */}
        <div className="rounded-lg border border-line bg-card p-3 space-y-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-dim mb-1">Simulate</div>
          <div>
            <div className="text-[10px] text-dim mb-1">Patient ref</div>
            <input
              value={patientRef}
              onChange={(e) => setPatientRef(e.target.value)}
              className="w-full rounded border border-line bg-elevated px-2 py-1 font-mono text-[11px] text-body outline-none focus:border-teal"
            />
          </div>
          <div>
            <div className="text-[10px] text-dim mb-1">Channel</div>
            <div className="flex gap-1">
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className="flex-1 rounded py-1 text-[10px] font-medium capitalize transition-all"
                  style={channel === c
                    ? { background: "var(--accent)", color: "rgb(var(--col-surface))" }
                    : { background: "rgb(var(--col-elevated))", color: "rgb(var(--col-dim2))" }
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Session meta */}
        <div className="rounded-lg border border-line bg-card p-3 space-y-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-dim">Live session</div>
          <Row label="Session ID">
            {sessionId
              ? <span className="font-mono text-[11px] text-dim2">{sessionId.slice(0, 8)}…</span>
              : <span className="text-dim">—</span>}
          </Row>
          <Row label="Status">
            {statusLabel
              ? <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[statusLabel]}`}>{statusLabel}</span>
              : <span className="text-dim">—</span>}
          </Row>
          <Row label="Request type">
            {intent
              ? <span className="text-xs text-body">{intentLabel(intent)}</span>
              : <span className="text-dim">—</span>}
          </Row>
          <Row label="Started">
            <span className="text-xs text-dim2">
              {sessionStart ? sessionStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
            </span>
          </Row>
          <Row label="Actions taken"><span className="text-xs text-dim2">{toolCalls.length || "—"}</span></Row>
          {isUrgent && (
            <div className="rounded-md bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] px-2.5 py-1.5 text-[10px] font-semibold text-danger">
              ⚠ Flagged urgent
            </div>
          )}
          {pendingDesc && (
            <div className="rounded-md border border-warn/30 bg-warn/10 px-2.5 py-1.5 text-[10px] text-warn">
              Pending: {pendingDesc}
            </div>
          )}
        </div>

        {/* HIPAA notice */}
        <div className="mt-auto rounded-lg border border-line bg-card p-3">
          <div className="text-[9px] text-dim leading-relaxed">
            PHI is redacted before any model call. Writes require two-phase confirmation. Session data is not persisted beyond this page.
          </div>
        </div>
      </div>
    </div>
  );
}
