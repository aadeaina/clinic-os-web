"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listSessions, getAnalytics, getBilling, getLabs } from "@/lib/api";
import { SessionRow, AnalyticsSummary } from "@/lib/types";
import { BillingSummary, LabsSummary } from "@/lib/api";
import { intentLabel } from "@/lib/intents";

const STATUS_STYLES: Record<string, string> = {
  escalated: "bg-[rgba(239,68,68,0.12)] text-danger  border border-[rgba(239,68,68,0.28)]",
  active:    "bg-[rgba(245,158,11,0.10)] text-warn   border border-[rgba(245,158,11,0.26)]",
  contained: "bg-[rgba(20,184,166,0.12)] text-teal   border border-[rgba(20,184,166,0.28)]",
  closed:    "bg-[rgba(74,112,112,0.10)] text-dim2   border border-[rgba(74,112,112,0.25)]",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.closed}`}>
      {status}
    </span>
  );
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CrossDomainKPI({ label, value, sub, color, href }: { label: string; value: string; sub?: string; color?: string; href: string }) {
  return (
    <Link href={href} className="group rounded-lg border border-line bg-card p-4 transition-colors hover:border-line2 block">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-dim mb-2 group-hover:text-dim2 transition-colors">{label}</div>
      <div className="text-2xl font-semibold tabular-nums" style={{ color: color ?? "var(--accent)" }}>{value}</div>
      {sub && <div className="mt-1 text-[10px] text-dim">{sub}</div>}
    </Link>
  );
}

export default function Dashboard() {
  const [rows,    setRows]    = useState<SessionRow[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [labs,    setLabs]    = useState<LabsSummary | null>(null);

  useEffect(() => {
    listSessions().then(setRows).catch(() => {});
    getAnalytics().then(setSummary).catch(() => {});
    getBilling().then(setBilling).catch(() => {});
    getLabs().then(setLabs).catch(() => {});
  }, []);

  const activeCount   = rows.filter((r) => r.status === "active").length;
  const escalatedToday = rows.filter((r) => r.status === "escalated").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim2">Operations overview</h1>
        <Link href="/console"
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-surface transition-opacity hover:opacity-80"
          style={{ background: "var(--accent)" }}>
          + New session
        </Link>
      </div>

      {/* ── Cross-domain KPI strip ───────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <CrossDomainKPI
          href="/analytics"
          label="Containment rate"
          value={summary ? `${Math.round(summary.containment_rate * 100)}%` : "—"}
          sub={`${summary?.total_sessions ?? "—"} total sessions`}
        />
        <CrossDomainKPI
          href="/console"
          label="Active / escalated"
          value={`${activeCount} / ${escalatedToday}`}
          sub="Right now · today"
          color={escalatedToday > 0 ? "#ef4444" : "var(--accent)"}
        />
        <CrossDomainKPI
          href="/billing"
          label="Outstanding balance"
          value={billing ? `$${(billing.outstanding / 1000).toFixed(0)}k` : "—"}
          sub={billing ? `${billing.pending_claims} pending claims` : ""}
          color="#f59e0b"
        />
        <CrossDomainKPI
          href="/labs"
          label="Urgent / STAT labs"
          value={labs ? String(labs.urgent) : "—"}
          sub={labs ? `${labs.results_ready} results awaiting review` : ""}
          color={labs && labs.urgent > 0 ? "#ef4444" : "var(--accent)"}
        />
      </div>

      {/* ── Recent sessions ──────────────────────────────── */}
      <div className="rounded-lg border border-line bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-dim2">Recent sessions</span>
          <span className="font-mono text-[10px] text-dim">{rows.length} loaded</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                {["Time", "Session ID", "Request type", "Channel", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-dim whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line/40 transition-colors duration-100 hover:bg-elevated">
                  <td className="px-4 py-2.5 text-[11px] text-dim whitespace-nowrap">{relTime(r.created)}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-dim2">{r.id.slice(0, 8)}</td>
                  <td className="px-4 py-2.5 text-xs text-body">{r.intent ? intentLabel(r.intent) : "—"}</td>
                  <td className="px-4 py-2.5 text-xs capitalize text-dim2">{r.channel}</td>
                  <td className="px-4 py-2.5"><StatusPill status={r.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-xs text-dim">
                    No sessions yet.{" "}
                    <Link href="/console" className="underline" style={{ color: "var(--accent)" }}>Open Console</Link>
                    {" "}to start one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
