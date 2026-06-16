"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface PatientSummary {
  name: string;
  next_appointment: { date: string; time: string; doctor: string; type: string; location: string } | null;
  unread_results: number;
  outstanding_balance: number;
  unread_messages: number;
}

export default function PatientPortal() {
  const [data, setData] = useState<PatientSummary | null>(null);

  useEffect(() => {
    fetch("/api/patient/appointments")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setData(d.summary))
      .catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const QUICK_ACTIONS = [
    { href: "/portal/appointments", label: "Schedule appointment", icon: "📅", desc: "Book or reschedule a visit" },
    { href: "/portal/messages",     label: "Message care team",    icon: "💬", desc: "Ask a question securely" },
    { href: "/portal/results",      label: "View lab results",     icon: "🧪", desc: "See your recent test results" },
    { href: "/portal/billing",      label: "Pay a bill",           icon: "💳", desc: "View and pay outstanding invoices" },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-body">{greeting}, {data?.name ?? ""}.</h1>
        <p className="mt-1 text-sm text-dim">Here's a summary of your care at Riverside Medical.</p>
      </div>

      {/* Alert strip */}
      {data && (data.unread_results > 0 || data.outstanding_balance > 0) && (
        <div className="space-y-2">
          {data.unread_results > 0 && (
            <Link href="/portal/results"
              className="flex items-center gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 transition-colors hover:bg-warn/15">
              <span className="text-warn">⚠</span>
              <span className="text-sm font-medium text-warn">
                {data.unread_results} lab result{data.unread_results > 1 ? "s" : ""} available — your doctor has reviewed {data.unread_results > 1 ? "them" : "it"}
              </span>
              <span className="ml-auto text-xs text-warn/70">View →</span>
            </Link>
          )}
          {data.outstanding_balance > 0 && (
            <Link href="/portal/billing"
              className="flex items-center gap-3 rounded-xl border border-line bg-elevated px-4 py-3 transition-colors hover:bg-card">
              <span>💳</span>
              <span className="text-sm text-body">
                You have an outstanding balance of{" "}
                <span className="font-semibold">${data.outstanding_balance.toLocaleString()}</span>
              </span>
              <span className="ml-auto text-xs text-dim">View bills →</span>
            </Link>
          )}
        </div>
      )}

      {/* Next appointment */}
      {data?.next_appointment && (
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim mb-3">Next appointment</div>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-lg font-bold text-body">{data.next_appointment.date} · {data.next_appointment.time}</div>
              <div className="text-sm text-dim2">{data.next_appointment.type} with {data.next_appointment.doctor}</div>
              <div className="text-xs text-dim">{data.next_appointment.location}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/portal/appointments"
                className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-dim2 transition-colors hover:text-body">
                Reschedule
              </Link>
              <button
                className="rounded-lg px-4 py-2 text-xs font-semibold text-surface transition-opacity hover:opacity-80"
                style={{ background: "var(--accent)" }}>
                Check in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim mb-3">Quick actions</div>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.href} href={a.href}
              className="group flex items-start gap-3 rounded-xl border border-line bg-card p-4 transition-all hover:border-line2 hover:bg-elevated">
              <span className="text-2xl">{a.icon}</span>
              <div>
                <div className="text-sm font-semibold text-body group-hover:text-body">{a.label}</div>
                <div className="text-xs text-dim mt-0.5">{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Privacy notice */}
      <div className="rounded-xl border border-line bg-card/60 p-4 text-[11px] text-dim leading-relaxed">
        🔒 Your health information is protected under HIPAA. Only you and your authorised care team can view your records. This portal uses secure, encrypted connections.
      </div>
    </div>
  );
}
