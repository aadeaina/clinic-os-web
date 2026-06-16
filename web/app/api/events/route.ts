import { randomUUID } from "crypto";
import { sessionStore, detectScenario, buildSteps } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text: string = body.text ?? "";

  const session_id = randomUUID();
  const scenario = detectScenario(text);
  const { streamSteps, confirmSteps } = buildSteps(scenario);

  sessionStore.set(session_id, { scenario, streamSteps, confirmSteps });

  return Response.json({ session_id });
}
