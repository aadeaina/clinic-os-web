"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSettings, ACCENT_HEX } from "@/lib/settings-store";
import type { AuthUser, UserRole } from "@/lib/auth";

interface NavItem {
  href:  string;
  label: string;
  roles: UserRole[];
  icon:  React.ReactNode;
}

const NAV: NavItem[] = [
  {
    href: "/", label: "Dashboard",
    roles: ["admin", "doctor", "billing", "nurse", "front_desk"],
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: "/console", label: "Console",
    roles: ["admin", "doctor", "nurse", "front_desk"],
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2,5 6,8 2,11" /><line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    href: "/analytics", label: "Analytics",
    roles: ["admin", "doctor", "billing"],
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="2" y1="14" x2="2" y2="7" /><line x1="6" y1="14" x2="6" y2="9" />
        <line x1="10" y1="14" x2="10" y2="5" /><line x1="14" y1="14" x2="14" y2="3" />
      </svg>
    ),
  },
  {
    href: "/billing", label: "Billing",
    roles: ["admin", "billing"],
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="12" height="10" rx="1.5" />
        <line x1="2" y1="7" x2="14" y2="7" /><line x1="5" y1="10.5" x2="8" y2="10.5" />
      </svg>
    ),
  },
  {
    href: "/departments", label: "Departments",
    roles: ["admin", "doctor", "nurse", "front_desk", "billing"],
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2L2 5v8h12V5L8 2z" /><rect x="6" y="9" width="4" height="5" rx=".5" />
      </svg>
    ),
  },
  {
    href: "/labs", label: "Labs",
    roles: ["admin", "doctor", "nurse"],
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2v5L2 12a1.5 1.5 0 001.3 2.3h9.4A1.5 1.5 0 0014 12l-4-5V2" />
        <line x1="5" y1="2" x2="11" y2="2" />
        <circle cx="9.5" cy="11" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/settings", label: "Settings",
    roles: ["admin", "doctor", "billing", "nurse", "front_desk"],
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="2" />
        <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" />
      </svg>
    ),
  },
];

interface SidebarProps {
  role?: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const path    = usePathname();
  const router  = useRouter();
  const { accentColor, clinicName } = useSettings();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { user?: AuthUser } | null) => { if (d?.user) setAuthUser(d.user); })
      .catch(() => {});
  }, []);

  const accent    = ACCENT_HEX[accentColor];
  const userRole  = (role ?? authUser?.role ?? "") as UserRole;
  const visibleNav = userRole
    ? NAV.filter((item) => item.roles.includes(userRole))
    : NAV;

  async function handleLogout() {
    setLoggingOut(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <nav className="flex w-[52px] shrink-0 flex-col items-center border-r border-line bg-surface py-3 gap-0.5">
      {/* Logo */}
      <div
        className="mb-4 flex h-[34px] w-[34px] items-center justify-center rounded-lg font-bold text-surface text-sm select-none"
        style={{ background: accent }}
      >
        {clinicName.charAt(0).toUpperCase()}
      </div>

      {/* Role-filtered nav */}
      {visibleNav.map((item) => {
        const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 ${
              active ? "text-surface" : "text-dim hover:text-body"
            }`}
            style={active ? { background: accent } : { background: "transparent" }}
          >
            {item.icon}
          </Link>
        );
      })}

      {/* Vertical clinic wordmark */}
      <div
        className="mt-auto mb-2 text-[9px] font-semibold tracking-[0.18em] text-dim uppercase select-none"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {clinicName}
      </div>

      {/* User avatar */}
      {authUser && (
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-surface select-none"
          style={{ background: accent }}
          title={`${authUser.name} · ${authUser.role}`}
        >
          {authUser.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        title="Sign out"
        className="mt-1 flex h-7 w-7 items-center justify-center rounded-lg text-dim transition-colors hover:text-danger disabled:opacity-40"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3h3a1 1 0 011 1v8a1 1 0 01-1 1h-3" />
          <polyline points="7,5 10,8 7,11" />
          <line x1="10" y1="8" x2="2" y2="8" />
        </svg>
      </button>
    </nav>
  );
}
