// Session tokens are HMAC-SHA256 signed (see signPayload/verifyPayload below) so the
// cookie value can't be forged by editing it client-side. Still a demo-grade scheme —
// production should move to a signed JWT library + a real user store — but unlike
// plain base64 it can't be tampered with without knowing AUTH_SECRET.

export const SESSION_COOKIE = "cos-auth";
const SESSION_MS = 8 * 60 * 60 * 1000;

export type UserRole = "admin" | "doctor" | "billing" | "nurse" | "front_desk" | "patient";

export interface AuthUser {
  id:          string;
  name:        string;
  email:       string;
  role:        UserRole;
  department?: string | null;
}

interface Payload extends AuthUser { exp: number }

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const str = atob(s);
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
  return arr;
}

// AUTH_SECRET is server-only (never NEXT_PUBLIC_*): both middleware (Edge runtime) and the
// auth API routes (Node runtime) run on the server, and Web Crypto's SubtleCrypto is
// available in both, so this one implementation works everywhere it's imported from.
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production — refusing to sign/verify tokens with a default secret.");
  }
  return "dev-only-change-me";
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw", encoder.encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
  );
}

export async function createToken(user: AuthUser): Promise<string> {
  const p: Payload = { ...user, exp: Date.now() + SESSION_MS };
  const payloadB64 = base64url(encoder.encode(JSON.stringify(p)));
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  return `${payloadB64}.${base64url(sig)}`;
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;
    const key = await hmacKey();
    const valid = await crypto.subtle.verify(
      "HMAC", key, base64urlDecode(sigB64), encoder.encode(payloadB64),
    );
    if (!valid) return null;
    const p: Payload = JSON.parse(decoder.decode(base64urlDecode(payloadB64)));
    if (p.exp < Date.now()) return null;
    return { id: p.id, name: p.name, email: p.email, role: p.role, department: p.department };
  } catch { return null; }
}

// ── Route-level access control ────────────────────────────────────────────────

const STAFF_ROLES: UserRole[] = ["admin", "doctor", "billing", "nurse", "front_desk"];

const ROUTE_ROLES: [string, UserRole[]][] = [
  // Staff routes
  ["/billing",       ["admin", "billing"]],
  ["/analytics",     ["admin", "doctor", "billing"]],
  ["/labs",          ["admin", "doctor", "nurse"]],
  ["/departments",   [...STAFF_ROLES]],
  ["/console",       ["admin", "doctor", "nurse", "front_desk"]],
  ["/settings",      [...STAFF_ROLES]],
  // Staff API routes
  ["/api/billing",   ["admin", "billing"]],
  ["/api/labs",      ["admin", "doctor", "nurse"]],
  ["/api/departments", [...STAFF_ROLES]],
  ["/api/analytics",   ["admin", "doctor", "billing"]],
  ["/api/sessions",    ["admin", "doctor", "nurse", "front_desk"]],
  ["/api/events",      ["admin", "doctor", "nurse", "front_desk", "patient"]],
  // Patient portal routes
  ["/portal",          ["patient"]],
  ["/api/patient",     ["patient"]],
];

export function canAccess(pathname: string, role: UserRole): boolean {
  // Root "/" is staff dashboard — patients get redirected to /portal
  if (pathname === "/" && role === "patient") return false;

  for (const [prefix, roles] of ROUTE_ROLES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/") || pathname.startsWith(prefix + "?")) {
      return roles.includes(role);
    }
  }
  return true;
}

export function defaultRedirect(role: UserRole): string {
  return role === "patient" ? "/portal" : "/";
}

// ── Demo users ────────────────────────────────────────────────────────────────

export const DEMO_USERS: (AuthUser & { password: string })[] = [
  {
    id: "usr-1", email: "admin@riverside.med",    password: "Admin@123",
    name: "System Admin",   role: "admin",       department: null,
  },
  {
    id: "usr-2", email: "chen@riverside.med",     password: "Doctor@123",
    name: "Dr. Sarah Chen", role: "doctor",      department: "Primary Care",
  },
  {
    id: "usr-3", email: "billing@riverside.med",  password: "Billing@123",
    name: "Maria Santos",   role: "billing",     department: null,
  },
  {
    id: "usr-4", email: "nurse@riverside.med",    password: "Nurse@123",
    name: "James Reyes RN", role: "nurse",       department: null,
  },
  {
    id: "usr-5", email: "front@riverside.med",    password: "Front@123",
    name: "Alex Kim",       role: "front_desk",  department: null,
  },
  {
    id: "usr-6", email: "john.doe@email.com",     password: "Patient@123",
    name: "John Doe",       role: "patient",     department: null,
  },
];

export function findUser(email: string, password: string): AuthUser | null {
  const u = DEMO_USERS.find(
    (d) => d.email.toLowerCase() === email.toLowerCase() && d.password === password,
  );
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, department: u.department };
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:      "Administrator",
  doctor:     "Physician",
  billing:    "Billing Coordinator",
  nurse:      "Nurse",
  front_desk: "Front Desk",
  patient:    "Patient",
};
