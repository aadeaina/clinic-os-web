import { Step } from "@/lib/types";
import AgentBadge from "./AgentBadge";
import ToolCallCard from "./ToolCallCard";

export default function ConversationTimeline({ steps }: { steps: Step[] }) {
  const rows: JSX.Element[] = [];

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];

    if (s.type === "routing" && s.decision) {
      rows.push(
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="text-dim">routed →</span>
          <AgentBadge agent={s.decision.agent || s.decision.intent} />
          <span className="font-mono text-[10px] text-dim">
            {Math.round(s.decision.confidence * 100)}%
            {s.decision.urgent && (
              <span className="ml-1 text-warn">· urgent</span>
            )}
          </span>
        </div>
      );
    } else if (s.type === "tool_use") {
      const result = steps[i + 1]?.type === "tool_result" ? steps[i + 1] : undefined;
      rows.push(<ToolCallCard key={i} use={s} result={result} />);
    } else if (s.type === "agent_msg" || s.type === "final") {
      if (s.type === "final" && steps[i - 1]?.type === "agent_msg") continue;
      rows.push(
        <div
          key={i}
          className="max-w-[88%] rounded-xl rounded-tl-sm border border-line bg-elevated px-3.5 py-2.5 text-xs text-body"
        >
          {s.text}
        </div>
      );
    } else if (s.type === "escalate") {
      rows.push(
        <div
          key={i}
          className="rounded-lg border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.07)] px-3.5 py-2.5 text-xs"
        >
          <span className="font-semibold text-danger">Escalated</span>
          <span className="text-body"> — {s.reason}</span>
        </div>
      );
    }
  }

  return <div className="space-y-2.5">{rows}</div>;
}
