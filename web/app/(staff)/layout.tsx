import { headers } from "next/headers";
import Sidebar from "@/components/Sidebar";

const ROLE_SHORT: Record<string, string> = {
  admin:      "Admin",
  doctor:     "MD",
  billing:    "Billing",
  nurse:      "RN",
  front_desk: "Front Desk",
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  let authUser: { id: string; name: string; role: string } | null = null;
  try {
    const raw = headers().get("x-auth-user");
    if (raw) authUser = JSON.parse(raw);
  } catch {}

  return (
    <div className="flex h-full">
      <Sidebar role={authUser?.role} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-line px-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-dim2">
            Clinic OS
          </span>

          <div className="flex items-center gap-4">
            {authUser && (
              <div className="flex items-center gap-2">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-surface"
                  style={{ background: "var(--accent)" }}
                >
                  {authUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden text-[11px] font-medium text-dim2 sm:block">
                  {authUser.name}
                </span>
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                  style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                >
                  {ROLE_SHORT[authUser.role] ?? authUser.role}
                </span>
              </div>
            )}

            <LiveIndicator />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
}

// Async server component — reads active session count
async function LiveIndicator() {
  let activeCount = 0;
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "/api";
    const rows = await fetch(`http://localhost:3000${base}/sessions`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : [])
      .catch(() => []);
    activeCount = (rows as { status: string }[]).filter((r) => r.status === "active").length;
  } catch {}

  return (
    <div className="flex items-center gap-1.5" title={activeCount ? `${activeCount} active session${activeCount > 1 ? "s" : ""}` : "No active sessions"}>
      <span className={activeCount > 0 ? "pulse-dot" : "h-1.5 w-1.5 rounded-full bg-dim/40"} />
      <span className="text-[10px] font-bold tracking-[0.12em] uppercase"
        style={{ color: activeCount > 0 ? "var(--accent)" : "rgb(var(--col-dim))" }}>
        {activeCount > 0 ? `${activeCount} active` : "idle"}
      </span>
    </div>
  );
}
