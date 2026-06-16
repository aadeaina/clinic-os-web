"use client";
import { useEffect, useState } from "react";
import { getLabs, LabsSummary, LabOrder, LabResult } from "@/lib/api";
import { useChartTheme } from "@/lib/chart-theme";
import KPI from "@/components/KPI";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const PRIORITY_PILL: Record<LabOrder["priority"], string> = {
  routine: "bg-[rgba(74,112,112,0.12)] text-dim2  border border-[rgba(74,112,112,0.25)]",
  urgent:  "bg-[rgba(245,158,11,0.10)] text-warn  border border-[rgba(245,158,11,0.26)]",
  stat:    "bg-[rgba(239,68,68,0.12)]  text-danger border border-[rgba(239,68,68,0.28)]",
};
const STATUS_PILL: Record<LabOrder["status"], string> = {
  pending:     "bg-[rgba(74,112,112,0.10)] text-dim  border border-[rgba(74,112,112,0.22)]",
  in_progress: "bg-[rgba(59,130,246,0.10)] text-[#3b82f6] border border-[rgba(59,130,246,0.25)]",
  complete:    "bg-[rgba(20,184,166,0.12)] text-teal border border-[rgba(20,184,166,0.28)]",
};
const FLAG_PILL: Record<LabResult["flag"], string> = {
  normal:   "bg-[rgba(74,112,112,0.10)] text-dim2  border border-[rgba(74,112,112,0.22)]",
  high:     "bg-[rgba(245,158,11,0.10)] text-warn  border border-[rgba(245,158,11,0.26)]",
  low:      "bg-[rgba(59,130,246,0.10)] text-[#3b82f6] border border-[rgba(59,130,246,0.25)]",
  critical: "bg-[rgba(239,68,68,0.12)]  text-danger border border-[rgba(239,68,68,0.28)]",
};

const REFERENCE_RANGES: Record<string, string> = {
  "CBC": "WBC 4.5–11.0 k/µL · RBC 4.2–5.8 M/µL · Hgb 12–16 g/dL",
  "BMP": "Na 135–145 · K 3.5–5.0 · Cr 0.6–1.2 mg/dL",
  "Hemoglobin A1c": "< 5.7% normal · 5.7–6.4% prediabetes · ≥ 6.5% diabetes",
  "Lipid Panel": "LDL < 100 · HDL > 40 (M) / 50 (F) · TG < 150 mg/dL",
  "Troponin I": "< 0.04 ng/mL",
  "TSH": "0.4–4.0 mIU/L",
  "PT/INR": "INR 0.8–1.2 (therapeutic 2.0–3.0 on warfarin)",
  "Urinalysis": "pH 4.5–8.0 · Protein negative · Glucose negative",
};

const BAR_COLORS = ["#14b8a6","#2DD4BF","#0D7377","#3b82f6","#8b5cf6","#f59e0b","#ef4444","#4a7070"];

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface CriticalAlertProps { results: LabResult[] }
function CriticalAlert({ results }: CriticalAlertProps) {
  const crits = results.filter((r) => r.flag === "critical");
  if (crits.length === 0) return null;
  return (
    <div className="rounded-lg border border-danger/40 bg-danger/10 p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round">
          <path d="M8 2L1.5 13h13L8 2z" /><line x1="8" y1="7" x2="8" y2="10" /><circle cx="8" cy="12" r="0.5" fill="#ef4444" />
        </svg>
        <span className="text-xs font-bold text-danger">
          {crits.length} critical result{crits.length > 1 ? "s" : ""} require immediate physician review
        </span>
      </div>
      {crits.map((r) => (
        <div key={r.id} className="ml-5 text-[11px] text-danger/80">
          {r.patient} — {r.test}: <span className="font-semibold">{r.result}</span>
        </div>
      ))}
    </div>
  );
}

export default function LabsPage() {
  const [data, setData]         = useState<LabsSummary | null>(null);
  const [err, setErr]           = useState("");
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const { GRID, TICK, TIP }     = useChartTheme();

  useEffect(() => {
    getLabs().then(setData).catch(() => setErr("Lab data unavailable."));
  }, []);

  function markReviewed(id: string) {
    setReviewed((prev) => new Set([...prev, id]));
  }

  // Sort: STAT first, then urgent, then routine
  const PRIORITY_ORDER = { stat: 0, urgent: 1, routine: 2 };
  const sortedOrders = (data?.orders ?? []).slice().sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );

  return (
    <div className="space-y-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim2">Labs</div>

      {err && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">{err}</div>}

      {/* ── Critical alert banner ─────────────────────────── */}
      {data && <CriticalAlert results={data.results} />}

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Pending orders"  value={data ? String(data.pending_orders) : "—"} sub="Awaiting collection or processing" />
        <KPI label="Urgent / STAT"   value={data ? String(data.urgent)          : "—"} sub="Priority escalated" color="#ef4444" />
        <KPI label="Results ready"   value={data ? String(data.results_ready)   : "—"} sub="Awaiting physician review" color="#f59e0b" />
        <KPI label="Reviewed today"  value={data ? String(data.reviewed_today + reviewed.size) : "—"} sub="Signed off by provider" color="#2DD4BF" />
      </div>

      {/* ── Orders + Results ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Pending orders — STAT at top */}
        <div className="rounded-lg border border-line bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-dim2">Pending orders</span>
            <span className="text-[10px] text-dim">{sortedOrders.length} orders</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
            <table className="w-full">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-line">
                  {["Priority", "Patient", "Test", "Ordered by", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-dim whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((o) => (
                  <tr key={o.id}
                    className={`border-b border-line/40 hover:bg-elevated transition-colors ${o.priority === "stat" ? "bg-danger/5" : ""}`}
                  >
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase ${PRIORITY_PILL[o.priority]}`}>
                        {o.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-body whitespace-nowrap">{o.patient}</td>
                    <td className="px-3 py-2.5 text-[11px] text-dim2">{o.test}</td>
                    <td className="px-3 py-2.5 text-[11px] text-dim">{o.ordered_by}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_PILL[o.status]}`}>
                        {o.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results — with reference ranges + mark reviewed */}
        <div className="rounded-lg border border-line bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-dim2">Recent results</span>
            <span className="text-[10px] text-dim">{data?.results.length ?? 0} results</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
            <table className="w-full">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-line">
                  {["Patient", "Test", "Result", "Flag", "Reviewed", ""].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-dim whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.results ?? []).map((r) => {
                  const isReviewed = reviewed.has(r.id);
                  return (
                    <tr key={r.id}
                      className={`border-b border-line/40 transition-colors ${r.flag === "critical" && !isReviewed ? "bg-danger/5 hover:bg-danger/8" : "hover:bg-elevated"}`}
                    >
                      <td className="px-3 py-2 text-xs text-body whitespace-nowrap">{r.patient}</td>
                      <td className="px-3 py-2">
                        <div className="text-[11px] text-body">{r.test}</div>
                        {REFERENCE_RANGES[r.test] && (
                          <div className="text-[9px] text-dim mt-0.5 leading-snug">{REFERENCE_RANGES[r.test]}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium text-body whitespace-nowrap">{r.result}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${FLAG_PILL[r.flag]}`}>
                          {r.flag}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-dim whitespace-nowrap">
                        {isReviewed ? (
                          <span className="text-teal">✓ You · just now</span>
                        ) : (
                          <span>{r.reviewed_by} · {relTime(r.reviewed)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {!isReviewed && (
                          <button
                            onClick={() => markReviewed(r.id)}
                            className="rounded px-2 py-0.5 text-[10px] font-medium transition-all hover:opacity-80"
                            style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}
                          >
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Test volume chart ──────────────────────────────── */}
      <div className="rounded-lg border border-line bg-card p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-dim mb-1">Test volume by type</div>
        <div className="mb-3 text-[11px] text-dim2">Orders processed this month</div>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.by_test_type ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="test" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip {...TIP} />
              <Bar dataKey="count" name="Orders" radius={[3, 3, 0, 0]} maxBarSize={36}>
                {(data?.by_test_type ?? []).map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
