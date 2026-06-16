import { sessionStore } from "@/lib/mock-store";
import type { Step } from "@/lib/types";

export const dynamic = "force-dynamic";

// Delay in ms before each step type to mimic a real processing pipeline
const STEP_DELAY: Record<string, number> = {
  routing:     300,
  tool_use:    400,
  tool_result: 700,
  agent_msg:   500,
  pending:     300,
  final:       400,
  escalate:    350,
};

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = sessionStore.get(params.id);
  const steps: Step[] = session?.streamSteps ?? [];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (const step of steps) {
        await delay(STEP_DELAY[step.type] ?? 400);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(step)}\n\n`));
      }
      await delay(200);
      controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
