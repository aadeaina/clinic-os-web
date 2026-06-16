// Demo auth — tokens are unsigned base64.
// Production: replace with signed JWT (jose library) + database lookup.

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

export function createToken(user: AuthUser): string {
  const p: Payload = { ...user, exp: Date.now() + SESSION_MS };
  return btoa(encodeURIComponent(JSON.stringify(p)));
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const p: Payload = JSON.parse(decodeURIComponent(atob(token)));
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
