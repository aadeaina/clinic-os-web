"use client";
import { useEffect, useState } from "react";

interface Appointment {
  id: string;
  date: string;
  time: string;
  doctor: string;
  specialty: string;
  type: string;
  location: string;
  status: "upcoming" | "completed" | "cancelled";
  notes?: string;
}

const STATUS_STYLE: Record<Appointment["status"], string> = {
  upcoming:  "bg-[rgba(20,184,166,0.12)] text-teal border border-[rgba(20,184,166,0.28)]",
  completed: "bg-[rgba(74,112,112,0.10)] text-dim2 border border-[rgba(74,112,112,0.22)]",
  cancelled: "bg-[rgba(239,68,68,0.10)] text-danger border border-[rgba(239,68,68,0.26)]",
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    fetch("/api/patient/appointments")
      .then((r) => r.ok ? r.json() : { appointments: [] })
      .then((d) => setAppointments(d.appointments ?? []))
      .catch(() => {});
  }, []);

  const upcoming  = appointments.filter((a) => a.status === "upcoming");
  const past      = appointments.filter((a) => a.status !== "upcoming");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-body">Appointments</h1>
        <button
          className="rounded-lg px-4 py-2 text-xs font-semibold text-surface transition-opacity hover:opacity-80"
          style={{ background: "var(--accent)" }}>
          Request appointment
        </button>
      </div>

      {/* Upcoming */}
      <section>
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim mb-3">
          Upcoming ({upcoming.length})
        </div>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-line bg-card p-6 text-center text-sm text-dim">
            No upcoming appointments. Use the button above to schedule one.
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <div key={a.id} className="rounded-xl border border-line bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-body">{a.date} · {a.time}</span>
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[a.status]}`}>
                        {a.status}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-dim2">{a.type}</div>
                    <div className="text-xs text-dim">{a.doctor} · {a.specialty}</div>
                    <div className="text-xs text-dim">{a.location}</div>
                    {a.notes && <div className="mt-2 rounded-lg bg-elevated px-3 py-2 text-xs text-dim2">{a.notes}</div>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button className="rounded-lg border border-line px-3 py-1.5 text-xs text-dim2 transition-colors hover:text-body">
                      Reschedule
                    </button>
                    <button className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger/70 transition-colors hover:text-danger">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      <section>
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim mb-3">
          Past ({past.length})
        </div>
        <div className="rounded-xl border border-line bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                {["Date", "Provider", "Visit type", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-dim">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {past.map((a) => (
                <tr key={a.id} className="border-b border-line/40 hover:bg-elevated transition-colors">
                  <td className="px-4 py-3 text-sm text-body">{a.date}</td>
                  <td className="px-4 py-3 text-sm text-dim2">{a.doctor}</td>
                  <td className="px-4 py-3 text-sm text-dim2">{a.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[a.status]}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
              {past.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-dim">No past appointments on record.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
