export type StepType =
  | "routing" | "agent_msg" | "tool_use" | "tool_result"
  | "pending" | "escalate" | "final";

export interface Step {
  type: StepType;
  decision?: { intent: string; agent: string | null; confidence: number; urgent: boolean; rationale: string };
  agent?: string;
  text?: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  action?: string;
  action_id?: string;
  summary?: string;
  reason?: string;
  contained?: boolean;
}

export interface SessionRow {
  id: string; channel: string; status: string;
  contained: boolean | null; intent: string | null; created: string;
}

export interface AnalyticsSummary {
  total_sessions: number; containment_rate: number;
  escalation_rate: number; by_intent: Record<string, number>;
}
