export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    total_sessions: 147,
    containment_rate: 0.82,
    escalation_rate: 0.09,
    by_intent: {
      scheduling: 61,
      billing:    34,
      intake:     28,
      triage:     13,
      smalltalk:  11,
    },
  });
}
