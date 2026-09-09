"use client";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";

const STAFF_DEMO = [
  { role: "Administrator", email: "admin@riverside.med",   password: "Admin@123"   },
  { role: "Physician",     email: "chen@riverside.med",    password: "Doctor@123"  },
  { role: "Billing",       email: "billing@riverside.med", password: "Billing@123" },
  { role: "Nurse",         email: "nurse@riverside.med",   password: "Nurse@123"   },
  { role: "Front Desk",    email: "front@riverside.med",   password: "Front@123"   },
];

const PATIENT_DEMO = [
  { role: "Patient", email: "john.doe@email.com", password: "Patient@123" },
];

// Off by default in any deployment that doesn't explicitly opt in — flip
// NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=1 for demo/sales environments only.
const SHOW_DEMO_CREDENTIALS = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "1";

export default function LoginPage() {
  const router   = useRouter();
  const [mode, setMode]         = useState<"staff" | "patient">("staff");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { user?: { role: string } } | null) => {
        if (!d?.user) return;
        router.replace(d.user.role === "patient" ? "/portal" : "/");
      })
      .catch(() => {});
  }, [router]);

  // Clear fields when switching mode
  function switchMode(m: "staff" | "patient") {
    setMode(m);
    setEmail("");
    setPassword("");
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Invalid credentials.");
      } else {
        const { user } = await res.json() as { user: { role: string } };
        router.push(user.role === "patient" ? "/portal" : "/");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const demos = mode === "staff" ? STAFF_DEMO : PATIENT_DEMO;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto py-8"
      style={{ background: "rgb(var(--col-surface))" }}>
      <div className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(20,184,166,0.13) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-[440px] px-4">
        {/* Branding */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-surface"
            style={{ background: "var(--accent, #14b8a6)" }}>R</div>
          <div className="text-center">
            <h1 className="text-base font-bold tracking-tight text-body">Riverside Medical</h1>
            <p className="mt-0.5 text-xs text-dim">Clinic OS · Secure Portal</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mb-4 flex rounded-xl border border-line bg-elevated p-1">
          {(["staff", "patient"] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-150"
              style={mode === m
                ? { background: "var(--accent)", color: "rgb(var(--col-surface))" }
                : { background: "transparent", color: "rgb(var(--col-dim2))" }
              }
            >
              {m === "staff" ? "Staff login" : "Patient portal"}
            </button>
          ))}
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-line bg-card p-7 shadow-2xl">
          {mode === "patient" && (
            <p className="mb-5 rounded-lg border border-line bg-elevated px-3.5 py-2.5 text-xs text-dim leading-relaxed">
              Access your appointments, lab results, bills, and messages. Your data is visible only to you and your care team.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-dim2">
                {mode === "staff" ? "Staff email" : "Email address"}
              </label>
              <input
                type="email" autoFocus required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === "staff" ? "you@riverside.med" : "you@email.com"}
                className="w-full rounded-lg border border-line bg-elevated px-3.5 py-2.5 text-sm text-body placeholder-dim outline-none transition-colors focus:border-teal"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-dim2">
                Password
              </label>
              <input
                type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-line bg-elevated px-3.5 py-2.5 text-sm text-body placeholder-dim outline-none transition-colors focus:border-teal"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="mt-1 w-full rounded-lg py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 disabled:opacity-50"
              style={{ background: "var(--accent, #14b8a6)" }}
            >
              {loading ? "Signing in…" : mode === "staff" ? "Sign in to staff portal" : "Access patient portal"}
            </button>
          </form>

          {mode === "staff" && (
            <p className="mt-4 text-center text-[10px] leading-relaxed text-dim">
              Restricted to authorised personnel only. Unauthorised access is subject to civil and criminal penalties.
            </p>
          )}
        </div>

        {/* Demo credentials */}
        {SHOW_DEMO_CREDENTIALS && (
        <div className="mt-3 rounded-xl border border-line bg-card/60 p-4 backdrop-blur">
          <div className="mb-2.5 flex items-center gap-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-dim">Demo credentials</div>
            <div className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{ background: "rgba(20,184,166,0.12)", color: "var(--accent, #14b8a6)" }}>
              {mode === "staff" ? "5 roles" : "1 patient"}
            </div>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Role", "Email", "Password"].map((h) => (
                  <th key={h} className="pb-1.5 text-left text-[9px] font-semibold uppercase tracking-wide text-dim">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {demos.map((d) => (
                <tr key={d.email}
                  onClick={() => { setEmail(d.email); setPassword(d.password); setError(""); }}
                  className="cursor-pointer border-t border-line/50 transition-colors hover:bg-elevated/60"
                >
                  <td className="py-1.5 pr-3 text-[11px] font-medium text-dim2">{d.role}</td>
                  <td className="py-1.5 pr-3 font-mono text-[10px] text-dim">{d.email}</td>
                  <td className="py-1.5 font-mono text-[10px] text-dim">{d.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[9px] text-dim">Click any row to auto-fill.</p>
        </div>
        )}
      </div>
    </div>
  );
}
