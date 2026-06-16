"use client";
import { useEffect, useState } from "react";

interface PatientResult {
  id: string;
  test: string;
  date: string;
  result: string;
  unit: string;
  reference_range: string;
  flag: "normal" | "high" | "low" | "critical";
  reviewed_by: string;
  reviewed_on: string;
  note?: string;
}

const FLAG_CONFIG: Record<PatientResult["flag"], { label: string; style: string; desc: string }> = {
  normal:   { label: "Normal",   style: "text-teal bg-[rgba(20,184,166,0.1)] border-[rgba(20,184,166,0.28)]",  desc: "Your result is within the normal range." },
  high:     { label: "High",     style: "text-warn bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.28)]",  desc: "Your result is above the normal range. Your doctor has been notified." },
  low:      { label: "Low",      style: "text-[#3b82f6] bg-[rgba(59,130,246,0.1)] border-[rgba(59,130,246,0.28)]", desc: "Your result is below the normal range. Your doctor has been notified." },
  critical: { label: "Critical", style: "text-danger bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.28)]",  desc: "This result requires immediate attention. Your care team has been alerted." },
};

export default function PatientResults() {
  const [results, setResults] = useState<PatientResult[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/patient/results")
      .then((r) => r.ok ? r.json() : { results: [] })
      .then((d) => setResults(d.results ?? []))
      .catch(() => {});
  }, []);

  const hasAbnormal = results.some((r) => r.flag !== "normal");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-body">Lab Results</h1>

      {hasAbnormal && (
        <div className="rounded-xl border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
          Some of your recent results are outside the normal range. Your care team has reviewed them and will follow up with you if any action is needed.
        </div>
      )}

      <div className="space-y-3">
        {results.map((r) => {
          const cfg  = FLAG_CONFIG[r.flag];
          const open = expanded === r.id;
          return (
            <div key={r.id}
              className={`rounded-xl border bg-card overflow-hidden transition-all ${r.flag === "critical" ? "border-danger/30" : "border-line"}`}>
              <button
                onClick={() => setExpanded(open ? null : r.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-sm font-semibold text-body">{r.test}</div>
                    <div className="text-xs text-dim mt-0.5">{r.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold text-body">{r.result} <span className="text-xs font-normal text-dim">{r.unit}</span></div>
                    <div className="text-[10px] text-dim">Range: {r.reference_range}</div>
                  </div>
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold border ${cfg.style}`}>
                    {cfg.label}
                  </span>
                  <span className="text-dim2">{open ? "▲" : "▼"}</span>
                </div>
              </button>

              {open && (
                <div className="border-t border-line px-5 py-4 space-y-3 bg-elevated/50">
                  <div className={`rounded-lg border px-3.5 py-2.5 text-xs ${cfg.style}`}>
                    {cfg.desc}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-dim uppercase tracking-wide mb-1">Your result</div>
                      <div className="text-base font-bold text-body">{r.result} <span className="text-sm font-normal text-dim">{r.unit}</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-dim uppercase tracking-wide mb-1">Normal range</div>
                      <div className="text-sm text-body">{r.reference_range} {r.unit}</div>
                    </div>
                  </div>
                  {r.note && (
                    <div>
                      <div className="text-[10px] text-dim uppercase tracking-wide mb-1">Doctor&apos;s note</div>
                      <div className="text-xs text-body leading-relaxed bg-card rounded-lg p-3">{r.note}</div>
                    </div>
                  )}
                  <div className="text-[10px] text-dim">
                    Reviewed by {r.reviewed_by} on {r.reviewed_on}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {results.length === 0 && (
          <div className="rounded-xl border border-line bg-card p-8 text-center text-sm text-dim">
            No lab results on file yet.
          </div>
        )}
      </div>

      <p className="text-xs text-dim text-center leading-relaxed">
        Results are reviewed by your physician before being released. If you have questions about your results, message your care team.
      </p>
    </div>
  );
}
