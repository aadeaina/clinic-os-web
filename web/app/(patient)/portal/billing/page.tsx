"use client";
import { useEffect, useState } from "react";

interface PatientInvoice {
  id: string;
  date: string;
  service: string;
  provider: string;
  billed: number;
  insurance_paid: number;
  patient_owes: number;
  status: "paid" | "pending" | "overdue";
}

const STATUS_STYLE: Record<PatientInvoice["status"], string> = {
  paid:    "bg-[rgba(20,184,166,0.12)] text-teal border border-[rgba(20,184,166,0.28)]",
  pending: "bg-[rgba(245,158,11,0.10)] text-warn border border-[rgba(245,158,11,0.26)]",
  overdue: "bg-[rgba(239,68,68,0.10)] text-danger border border-[rgba(239,68,68,0.26)]",
};

function fmt(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`; }

export default function PatientBillingPage() {
  const [invoices, setInvoices]   = useState<PatientInvoice[]>([]);
  const [summary, setSummary]     = useState<{ total_owed: number; total_paid: number } | null>(null);

  useEffect(() => {
    fetch("/api/patient/billing")
      .then((r) => r.ok ? r.json() : { invoices: [], summary: null })
      .then((d) => { setInvoices(d.invoices ?? []); setSummary(d.summary ?? null); })
      .catch(() => {});
  }, []);

  const outstanding = invoices.filter((i) => i.status !== "paid");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-body">Billing & Payments</h1>

      {/* Balance summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-card p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim mb-2">Amount due</div>
            <div className="text-3xl font-bold" style={{ color: summary.total_owed > 0 ? "#f59e0b" : "var(--accent)" }}>
              {fmt(summary.total_owed)}
            </div>
            {summary.total_owed > 0 && (
              <button
                className="mt-3 w-full rounded-lg py-2 text-sm font-semibold text-surface transition-opacity hover:opacity-80"
                style={{ background: "var(--accent)" }}>
                Pay balance
              </button>
            )}
            {summary.total_owed === 0 && (
              <p className="mt-2 text-xs text-dim">Your account is paid in full. Thank you!</p>
            )}
          </div>
          <div className="rounded-xl border border-line bg-card p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim mb-2">Total paid (YTD)</div>
            <div className="text-3xl font-bold" style={{ color: "var(--accent)" }}>{fmt(summary.total_paid)}</div>
            <p className="mt-2 text-xs text-dim">Includes insurance and patient payments</p>
          </div>
        </div>
      )}

      {/* Outstanding notices */}
      {outstanding.length > 0 && (
        <div className="space-y-2">
          {outstanding.map((i) => (
            <div key={i.id}
              className={`flex items-center justify-between rounded-xl border p-4 ${i.status === "overdue" ? "border-danger/30 bg-danger/5" : "border-warn/20 bg-warn/5"}`}>
              <div>
                <div className="text-sm font-semibold text-body">{i.service}</div>
                <div className="text-xs text-dim mt-0.5">{i.date} · {i.provider}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: i.status === "overdue" ? "#ef4444" : "#f59e0b" }}>
                    {fmt(i.patient_owes)}
                  </div>
                  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[i.status]}`}>
                    {i.status}
                  </span>
                </div>
                <button
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-surface transition-opacity hover:opacity-80"
                  style={{ background: "var(--accent)" }}>
                  Pay
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full invoice list */}
      <section>
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim mb-3">Statement of account</div>
        <div className="rounded-xl border border-line bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                {["Date", "Service", "Provider", "Billed", "Insurance paid", "You owe", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-dim whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b border-line/40 hover:bg-elevated transition-colors">
                  <td className="px-4 py-3 text-xs text-body whitespace-nowrap">{i.date}</td>
                  <td className="px-4 py-3 text-xs text-body">{i.service}</td>
                  <td className="px-4 py-3 text-xs text-dim2 whitespace-nowrap">{i.provider}</td>
                  <td className="px-4 py-3 text-xs text-dim2 tabular-nums">{fmt(i.billed)}</td>
                  <td className="px-4 py-3 text-xs text-dim2 tabular-nums">{fmt(i.insurance_paid)}</td>
                  <td className="px-4 py-3 text-xs font-semibold tabular-nums"
                    style={{ color: i.patient_owes > 0 && i.status !== "paid" ? "#f59e0b" : "rgb(var(--col-dim2))" }}>
                    {fmt(i.patient_owes)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[i.status]}`}>
                      {i.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-dim">Questions about your bill? <button className="underline" style={{ color: "var(--accent)" }}>Message our billing team</button></p>
    </div>
  );
}
