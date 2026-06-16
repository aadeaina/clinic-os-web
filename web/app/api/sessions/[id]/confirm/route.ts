import { sessionStore } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = sessionStore.get(params.id);
  const steps = session?.confirmSteps ?? [];
  return Response.json({ steps });
}
