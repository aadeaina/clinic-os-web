"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSettings, ACCENT_HEX } from "@/lib/settings-store";
import { useState } from "react";

const NAV = [
  { href: "/portal",               label: "Home" },
  { href: "/portal/appointments",  label: "Appointments" },
  { href: "/portal/results",       label: "Lab Results" },
  { href: "/portal/billing",       label: "Billing" },
  { href: "/portal/messages",      label: "Messages" },
];

interface PatientNavProps {
  userName?: string;
}

export default function PatientNav({ userName }: PatientNavProps) {
  const path    = usePathname();
  const router  = useRouter();
  const { accentColor, clinicName } = useSettings();
  const accent  = ACCENT_HEX[accentColor];
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-card px-6">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-surface"
          style={{ background: accent }}>
          {clinicName.charAt(0)}
        </div>
        <div>
          <div className="text-xs font-bold text-body">{clinicName}</div>
          <div className="text-[10px] text-dim">Patient Portal</div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex items-center gap-1">
        {NAV.map((item) => {
          const active = item.href === "/portal" ? path === "/portal" : path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150"
              style={active
                ? { background: "var(--accent)", color: "rgb(var(--col-surface))" }
                : { background: "transparent", color: "rgb(var(--col-dim2))" }
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="flex items-center gap-3">
        {userName && (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-surface"
              style={{ background: accent }}>
              {userName.charAt(0)}
            </div>
            <span className="text-xs text-dim2">{userName}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-dim transition-colors hover:text-danger hover:border-danger/40 disabled:opacity-40"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
