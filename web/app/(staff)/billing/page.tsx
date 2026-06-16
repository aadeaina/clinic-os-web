"use client";
import { useEffect, useState } from "react";
import { getBilling, BillingSummary, Claim } from "@/lib/api";
import { useChartTheme } from "@/lib/chart-theme";
import KPI from "@/components/KPI";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

const CLAIM_STATUS: Record<Claim["status"], string> = {
  paid:       "bg-[rgba(20,184,166,0.12)] text-teal  border border-[rgba(20,184,166,0.28)]",
  pending:    "bg-[rgba(245,158,11,0.10)] text-warn  border border-[rgba(245,158,11,0.26)]",
  denied:     "bg-[rgba(239,68,68,0.10)]  text-danger border border-[rgba(239,68,68,0.26)]",
  processing: "bg-[rgba(59,130,246,0.10)] text-[#3b82f6] border border-[rgba(59,130,246,0.25)]",
};

const INSURER_COLORS = ["#14b8a6","#2DD4BF","#0D7377","#3b82f6","#8b5cf6","#f59e0b","#4a7070"];

function fmtFull(n: number) { return `$${n.toLocaleString()}`; }
function fmt(n: number) { return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function BillingPage() {
  const [data, setData]   = useState<BillingSummary | null>(null);
  const [err, setErr]     = useState("");
  const { GRID, TICK, TIP } = useChartTheme();

  useEffect(() => {
    getBilling().then(setData).catch(() => setErr("Billing data unavailable."));
  }, []);

  // Compute 30/60/90-day aging from claims
  const aging = data
    ? (() => {
        const now = Date.now();
        let d30 = 0, d60 = 0, d90 = 0;
        data.claims
          .filter((c) => c.status === "pending" || c.status === "processing")
          .forEach((c) => {
            const age = (now - new Date(c.date).getTime()) / 86400000;
            if (age <= 30) d30 += c.amount;
            else if (age <= 60) d60 += c.amount;
            else d90 += c.amount;
          });
        return { d30, d60, d90 };
      })()
    : null;

  return (
    <div className="space-y-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim2">Billing</div>

      {err && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">{err}</div>}

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Billed MTD"      value={data ? fmtFull(data.total_billed_mtd)  : "—"} sub="Month to date" />
        <KPI label="Collected MTD"   value={data ? fmtFull(data.collected_mtd)     : "—"} sub={data ? `${Math.round(data.collection_rate * 100)}% collection rate` : ""} />
        <KPI label="Outstanding"     value={data ? fmtFull(data.outstanding)        : "—"} sub="Awaiting payment" color="#ef4444" />
        <KPI label="Pending claims"  value={data ? String(data.pending_claims)      : "—"} sub="In review or processing" color="#f59e0b" />
      </div>

      {/* ── Aging summary ─────────────────────────────────── */}
      {aging && (
        <div className="rounded-lg border border-line bg-card p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-dim mb-3">Accounts receivable aging</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "0–30 days",  value: aging.d30, color: "#f59e0b" },
              { label: "31–60 days", value: aging.d60, color: "#ef8c22" },
              { label: "61–90 days", value: aging.d90, color: "#ef4444" },
            ].map((b) => (
              <div key={b.label} className="rounded-lg border border-line bg-elevated p-3">
                <div className="text-[10px] text-dim">{b.label}</div>
                <div className="text-lg font-semibold tabular-nums mt-1" style={{ color: b.color }}>
                  {fmtFull(b.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Claims table + Revenue by dept ──────────────── */}
      <div className="grid grid-cols-3 gap-3">

        {/* Claims table */}
        <div className="col-span-2 rounded-lg border border-line bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-dim2">Recent claims</span>
            <span className="text-[10px] text-dim">{data?.claims.length ?? 0} claims</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  {["Date", "Claim ID", "Patient", "Service", "Insurance", "Amount", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-dim whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.claims ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-line/40 hover:bg-elevated transition-colors">
                    <td className="px-3 py-2.5 text-[11px] text-dim whitespace-nowrap">{formatDate(c.date)}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-dim2">{c.id}</td>
                    <td className="px-3 py-2.5 text-xs text-body whitespace-nowrap">{c.patient}</td>
                    <td className="px-3 py-2.5 text-[11px] text-dim2 max-w-[120px] truncate">{c.service}</td>
                    <td className="px-3 py-2.5 text-[11px] text-dim2 whitespace-nowrap">{c.insurance}</td>
                    <td className="px-3 py-2.5 text-xs font-medium text-body tabular-nums">{fmtFull(c.amount)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${CLAIM_STATUS[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue by dept */}
        <div className="rounded-lg border border-line bg-card p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-dim mb-1">Revenue by department</div>
          <div className="mb-3 text-[11px] text-dim2">MTD billed</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.revenue_by_dept ?? []} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 52 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <YAxis dataKey="dept" type="category" tick={{ ...TICK, fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip {...TIP} formatter={(v: number) => fmtFull(v)} />
                <Bar dataKey="revenue" name="Revenue" fill="#14b8a6" radius={[0, 3, 3, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Monthly trend + Insurance breakdown ─────────── */}
      <div className="grid grid-cols-2 gap-3">

        <div className="rounded-lg border border-line bg-card p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-dim mb-1">Monthly billing trend</div>
          <div className="mb-3 text-[11px] text-dim2">Billed vs collected — 6 months</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthly_trend ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="month" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <Tooltip {...TIP} formatter={(v: number) => fmtFull(v)} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="billed"    name="Billed"    fill="rgba(20,184,166,0.15)"  stroke="#14b8a6" strokeWidth={1.5} />
                <Area type="monotone" dataKey="collected" name="Collected" fill="rgba(13,115,119,0.20)"  stroke="#0D7377" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-card p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-dim mb-1">Insurance breakdown</div>
          <div className="mb-3 text-[11px] text-dim2">Billed revenue by insurer — MTD</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.by_insurance ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="insurer" tick={{ ...TICK, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <Tooltip {...TIP} formatter={(v: number) => fmtFull(v)} />
                <Bar dataKey="amount" radius={[3, 3, 0, 0]} maxBarSize={32}>
                  {(data?.by_insurance ?? []).map((_, i) => (
                    <Cell key={i} fill={INSURER_COLORS[i % INSURER_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
