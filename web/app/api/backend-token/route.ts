import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { mintBackendToken } from "@/lib/backend-token";

export const dynamic = "force-dynamic";

// Exchanges the caller's httpOnly session cookie for a short-lived token the browser
// can attach to requests it sends straight to the Django API. Requires a valid
// session — this is not a public endpoint.
export async function GET(req: NextRequest) {
  const raw  = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  const user = raw ? await verifyToken(raw) : null;
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const token = await mintBackendToken(user);
  return NextResponse.json({ token, expires_in: 300 });
}
