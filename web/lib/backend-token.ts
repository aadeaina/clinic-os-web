// Mints a short-lived, HMAC-signed token the browser can present to the Django API
// when it talks to it directly (dataSource: "real" — see settings-store.ts). Django
// verifies the signature with the same secret (api/authentication.py) and trusts the
// embedded role. The raw BACKEND_AUTH_SECRET never reaches the browser: only this
// short-lived derived token does, via /api/backend-token, which itself only runs for
// callers holding a valid httpOnly session cookie.
import type { AuthUser } from "./auth";

const TTL_SECONDS = 5 * 60;

function getBackendAuthSecret(): string {
  const secret = process.env.BACKEND_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BACKEND_AUTH_SECRET must be set in production.");
  }
  return "dev-only-change-me";
}

function base64url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

export async function mintBackendToken(user: AuthUser): Promise<string> {
  const { createHmac } = await import("node:crypto");
  const payload = { sub: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload), "utf-8"));
  const sig = createHmac("sha256", getBackendAuthSecret()).update(payloadB64).digest();
  return `${payloadB64}.${base64url(sig)}`;
}
