import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken, canAccess, defaultRedirect } from "./lib/auth";

const PUBLIC = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/me"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const raw  = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const user = raw ? verifyToken(raw) : null;

  if (!user) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    if (raw) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  // Redirect authenticated users away from login
  if (pathname === "/login") {
    return NextResponse.redirect(new URL(defaultRedirect(user.role), request.url));
  }

  if (!canAccess(pathname, user.role)) {
    return NextResponse.redirect(new URL(defaultRedirect(user.role), request.url));
  }

  // Forward user info to server components via request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-auth-user", JSON.stringify({ id: user.id, name: user.name, role: user.role }));
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
