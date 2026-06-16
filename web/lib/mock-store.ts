import type { Step } from "./types";

export type Scenario = "scheduling" | "intake" | "triage" | "billing" | "smalltalk";

export interface MockSession {
  scenario: Scenario;
  streamSteps: Step[];
  confirmSteps: Step[];
}

// Persist across HMR reloads in development
declare global {
  // eslint-disable-next-line no-var
  var __mockSessions: Map<string, MockSession> | undefined;
}

if (!global.__mockSessions) global.__mockSessions = new Map();
export const sessionStore: Map<string, MockSession> = global.__mockSessions;

// ─── Scenario step sequences ──────────────────────────────────────────────────

export function buildSteps(scenario: Scenario): Pick<MockSession, "streamSteps" | "confirmSteps"> {
  switch (scenario) {
    case "scheduling":
      return {
        streamSteps: [
          {
            type: "routing",
            decision: {
              intent: "scheduling",
              agent: "scheduling",
              confidence: 0.94,
              urgent: false,
              rationale: "Patient requesting appointment booking",
            },
          },
          {
            type: "tool_use",
            tool: "check_availability",
            input: { date_range: "next 7 days", provider: "Dr. Chen" },
          },
          {
            type: "tool_result",
            output: {
              slots: [
                "Mon Jun 16 @ 2:00 PM",
                "Tue Jun 17 @ 10:00 AM",
                "Thu Jun 19 @ 3:30 PM",
              ],
              provider: "Dr. Chen",
              location: "Main Campus, Suite 204",
            },
          },
          {
            type: "agent_msg",
            text: "I found three openings with Dr. Chen this week — Monday at 2 PM, Tuesday at 10 AM, or Thursday at 3:30 PM. All at Main Campus, Suite 204. Which works best for you?",
          },
          {
            type: "pending",
            action: "book_appointment",
            action_id: "act_sched_001",
            summary: "Book: Tue Jun 17 @ 10:00 AM · Dr. Chen · Main Campus Suite 204",
          },
        ],
        confirmSteps: [
          {
            type: "tool_use",
            tool: "book_appointment",
            input: { slot: "Tue Jun 17 @ 10:00 AM", provider: "Dr. Chen", patient_ref: "operator-test" },
          },
          {
            type: "tool_result",
            output: { confirmation: "APT-29847", status: "booked", reminder_sent: true },
          },
          {
            type: "final",
            text: "You're all set! Appointment confirmed with Dr. Chen on Tuesday, June 17th at 10:00 AM. Confirmation #APT-29847. A reminder will be sent 24 hours before.",
            contained: true,
          },
        ],
      };

    case "intake":
      return {
        streamSteps: [
          {
            type: "routing",
            decision: {
              intent: "intake",
              agent: "intake",
              confidence: 0.91,
              urgent: false,
              rationale: "New patient onboarding request",
            },
          },
          {
            type: "tool_use",
            tool: "create_patient_record",
            input: { status: "new", ref: "operator-test", source: "web" },
          },
          {
            type: "tool_result",
            output: { patient_id: "pt_92847", status: "draft", next_step: "demographics" },
          },
          {
            type: "agent_msg",
            text: "Welcome! I've started your patient file (ID: pt_92847). To complete registration I'll need three things: your full legal name, date of birth, and primary insurance provider. What's your full name?",
          },
          {
            type: "final",
            text: "Your registration is underway. A care coordinator will follow up within 1 business day to complete your intake. Is there anything else I can help with?",
            contained: true,
          },
        ],
        confirmSteps: [],
      };

    case "triage":
      return {
        streamSteps: [
          {
            type: "routing",
            decision: {
              intent: "triage",
              agent: "triage",
              confidence: 0.97,
              urgent: true,
              rationale: "Symptoms indicate potential cardiac event — high urgency",
            },
          },
          {
            type: "tool_use",
            tool: "assess_symptoms",
            input: { chief_complaint: "chest pain and shortness of breath", urgency_flag: true },
          },
          {
            type: "tool_result",
            output: {
              severity: "high",
              category: "cardiac",
              esi_level: 2,
              recommendation: "immediate_care",
              escalate: true,
            },
          },
          {
            type: "escalate",
            reason: "ESI Level 2 — potential cardiac event. Routing to on-call clinician immediately.",
          },
        ],
        confirmSteps: [],
      };

    case "billing":
      return {
        streamSteps: [
          {
            type: "routing",
            decision: {
              intent: "billing",
              agent: "billing",
              confidence: 0.89,
              urgent: false,
              rationale: "Patient inquiry about coverage and cost-sharing",
            },
          },
          {
            type: "tool_use",
            tool: "lookup_coverage",
            input: { patient_ref: "operator-test", plan_year: 2026 },
          },
          {
            type: "tool_result",
            output: {
              plan: "BlueCross PPO Gold",
              copay: { primary_care: "$25", specialist: "$50", urgent_care: "$75" },
              deductible: { annual: 1500, met: 1340, remaining: 160 },
              oop_max: { annual: 4000, met: 2100, remaining: 1900 },
            },
          },
          {
            type: "agent_msg",
            text: "You're covered under BlueCross PPO Gold. Primary care copay is $25, specialist $50. You've hit $1,340 of your $1,500 deductible — just $160 left. Is there a specific claim or upcoming service you'd like to review?",
          },
          {
            type: "final",
            text: "Glad I could help clarify your coverage. If you receive an unexpected bill, bring the EOB number to our billing team at ext. 4400.",
            contained: true,
          },
        ],
        confirmSteps: [],
      };

    case "smalltalk":
    default:
      return {
        streamSteps: [
          {
            type: "routing",
            decision: {
              intent: "smalltalk",
              agent: null,
              confidence: 0.78,
              urgent: false,
              rationale: "General inquiry, no specialised agent required",
            },
          },
          {
            type: "agent_msg",
            text: "Hi there! I'm the Clinic OS assistant. I can help with appointment scheduling, patient intake, insurance coverage questions, or clinical triage. What can I help you with today?",
          },
          {
            type: "final",
            text: "Feel free to ask about scheduling, billing, or anything else clinic-related.",
            contained: true,
          },
        ],
        confirmSteps: [],
      };
  }
}

// ─── Intent detection from message text ──────────────────────────────────────

export function detectScenario(text: string): Scenario {
  const t = text.toLowerCase();
  if (/\b(chest|short.?breath|emergency|urgent|fever|dizzy|nausea|blood|hurt|breathing|pain)\b/.test(t))
    return "triage";
  if (/\b(book|schedul|appoint|follow.?up|next week|slot|available|calendar|visit)\b/.test(t))
    return "scheduling";
  if (/\b(new patient|intake|register|enroll|first.?time|onboard|start my)\b/.test(t))
    return "intake";
  if (/\b(coverage|copay|bill|insurance|payment|deductible|claim|cost|eob)\b/.test(t))
    return "billing";
  return "smalltalk";
}
