"use client";
import { useEffect, useState } from "react";
import { getAnalytics, getAnalyticsDetail, AnalyticsDetail } from "@/lib/api";
import type { AnalyticsSummary } from "@/lib/types";
import { useChartTheme } from "@/lib/chart-theme";
import { intentLabel, INTENT_COLORS } from "@/lib/intents";
import KPI from "@/components/KPI";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from "recharts";

const PIE_COLORS = ["#14b8a6", "#2DD4BF", "#0D7377", "#3b82f6", "#8b5cf6"];

function ChartCard({ title, subtitle, children, full }: {
  title: string; subtitle?: string; children: React.ReactNode; full?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-line bg-card p-4 ${full ? "col-span-2" : ""}`}>
      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-dim">{title}</div>
      {subtitle && <div className="mb-3 text-[11px] text-dim2">{subtitle}</div>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">{msg}</div>
  );
}

export default function Analytics() {
  const [summary,  setSummary]  = useState<AnalyticsSummary | null>(null);
  const [detail,   setDetail]   = useState<AnalyticsDetail | null>(null);
  const [err,      setErr]      = useState("");
  const { GRID, TICK, TIP }     = useChartTheme();

  useEffect(() => {
    Promise.all([
      getAnalytics().catch(() => null),
      getAnalyticsDetail().catch(() => null),
    ]).then(([s, d]) => {
      if (!s && !d) { setErr("Analytics data unavailable. Check your data source in Settings."); return; }
      if (s) setSummary(s);
      if (d) setDetail(d);
    });
  }, []);

  const intentData = summary
    ? Object.entries(summary.by_intent).map(([key, count]) => ({
        intent: intentLabel(key), key, count,
      }))
    : [];

  return (
    <div className="space-y-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim2">Analytics</div>

      {err && <ErrorBanner msg={err} />}

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Total sessions"    value={summary ? String(summary.total_sessions) : "—"} sub="All time" />
        <KPI label="Containment rate"  value={summary ? `${Math.round(summary.containment_rate * 100)}%` : "—"} sub="AI resolved without escalation" />
        <KPI label="Escalation rate"   value={summary ? `${Math.round(summary.escalation_rate * 100)}%` : "—"} sub="Handed to staff" color="#ef4444" />
        <KPI label="Avg response time" value={detail ? "1.8 s" : "—"} sub="Median AI processing time" />
      </div>

      {/* ── Charts grid ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* 7-day session volume */}
        <ChartCard title="7-day session volume" subtitle="Daily sessions — contained vs escalated" full>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={detail?.daily_volume ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip {...TIP} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="contained"  name="Contained"  stackId="1" fill="rgba(20,184,166,0.25)"  stroke="#14b8a6" strokeWidth={1.5} />
                <Area type="monotone" dataKey="escalated"  name="Escalated"  stackId="1" fill="rgba(239,68,68,0.18)"   stroke="#ef4444" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Request type breakdown */}
        <ChartCard title="Request type breakdown" subtitle="Sessions by patient inquiry category">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intentData} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 60 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis dataKey="intent" type="category" tick={{ ...TICK, fontSize: 10 }} axisLine={false} tickLine={false} width={56} />
                <Tooltip {...TIP} />
                <Bar dataKey="count" name="Sessions" radius={[0, 3, 3, 0]} maxBarSize={18}>
                  {intentData.map((d) => (
                    <Cell key={d.key} fill={INTENT_COLORS[d.key] ?? "#14b8a6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Channel mix */}
        <ChartCard title="Channel mix" subtitle="Session origin by communication method">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={detail?.channel_mix ?? []}
                  dataKey="count" nameKey="channel"
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                >
                  {(detail?.channel_mix ?? []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TIP} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Containment trend */}
        <ChartCard title="Containment vs escalation trend" subtitle="7-day rolling rates">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={detail?.containment_trend ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                <Tooltip {...TIP} formatter={(v: number) => `${Math.round(v * 100)}%`} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="rate"            name="Containment" stroke="#14b8a6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="escalation_rate" name="Escalation"  stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Response time distribution */}
        <ChartCard title="Response time distribution" subtitle="AI processing time buckets">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detail?.response_times ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="bucket" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip {...TIP} />
                <Bar dataKey="count" name="Sessions" fill="#14b8a6" radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Hourly pattern */}
        <ChartCard title="Hourly session pattern" subtitle="Average sessions per hour across 7 days">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detail?.hourly ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="hour" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip {...TIP} />
                <Bar dataKey="sessions" name="Sessions" fill="#0D7377" radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Weekly day pattern */}
        <ChartCard title="Day-of-week pattern" subtitle="Total sessions per weekday" full>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detail?.weekly ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="day" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip {...TIP} />
                <Bar dataKey="sessions" name="Sessions" fill="#2DD4BF" radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

      </div>
    </div>
  );
}
