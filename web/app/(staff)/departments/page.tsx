"use client";
import { useEffect, useState } from "react";
import { getDepartments, Department, Doctor, Review } from "@/lib/api";

const STATUS_PILL: Record<Doctor["status"], string> = {
  available: "bg-[rgba(20,184,166,0.12)] text-teal  border border-[rgba(20,184,166,0.28)]",
  busy:      "bg-[rgba(245,158,11,0.10)] text-warn  border border-[rgba(245,158,11,0.26)]",
  away:      "bg-[rgba(74,112,112,0.12)] text-dim2  border border-[rgba(74,112,112,0.25)]",
  off:       "bg-[rgba(74,112,112,0.08)] text-dim   border border-[rgba(74,112,112,0.18)]",
};
const STATUS_LABEL: Record<Doctor["status"], string> = {
  available: "Available",
  busy:      "With patient",
  away:      "Away",
  off:       "Off today",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[11px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < Math.round(rating) ? "#f59e0b" : "#243f3f" }}>★</span>
      ))}
    </span>
  );
}

function ReviewCard({ r }: { r: Review }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <Stars rating={r.rating} />
        <span className="text-[10px] text-dim">{r.date}</span>
      </div>
      <p className="text-xs text-body leading-relaxed">{r.text}</p>
      <div className="text-[10px] text-dim">— {r.author}</div>
    </div>
  );
}

function DoctorCard({ doc, onSelect, active }: { doc: Doctor; onSelect: () => void; active: boolean }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-4 transition-all duration-150 space-y-3 ${
        active
          ? "border-[var(--accent-border)] bg-[var(--accent-dim)]"
          : "border-line bg-card hover:border-line2 hover:bg-elevated"
      }`}
    >
      {/* Avatar + status */}
      <div className="flex items-start justify-between">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: doc.color }}
        >
          {doc.initials}
        </div>
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_PILL[doc.status]}`}>
          {STATUS_LABEL[doc.status]}
        </span>
      </div>
      {/* Name + specialty */}
      <div>
        <div className="text-xs font-semibold text-body">{doc.name}, {doc.title}</div>
        <div className="text-[11px] text-dim2 mt-0.5">{doc.specialty}</div>
      </div>
      {/* Rating */}
      <div className="flex items-center gap-2">
        <Stars rating={doc.rating} />
        <span className="text-[11px] text-dim2">{doc.rating}</span>
        <span className="text-[10px] text-dim">({doc.review_count} reviews)</span>
      </div>
      {/* Stats row */}
      <div className="flex gap-4 pt-1 border-t border-line/60">
        <div>
          <div className="text-[10px] text-dim">Sessions / wk</div>
          <div className="text-xs font-medium text-body">{doc.sessions_week}</div>
        </div>
        <div>
          <div className="text-[10px] text-dim">Experience</div>
          <div className="text-xs font-medium text-body">{doc.years_exp} yrs</div>
        </div>
        <div>
          <div className="text-[10px] text-dim">Next slot</div>
          <div className="text-xs font-medium text-body">{doc.next_available}</div>
        </div>
      </div>
    </button>
  );
}

function DoctorDetail({ doc }: { doc: Doctor }) {
  return (
    <div className="rounded-lg border border-[var(--accent-border)] bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
          style={{ background: doc.color }}
        >
          {doc.initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-body">{doc.name}, {doc.title}</div>
          <div className="text-xs text-dim2">{doc.specialty}</div>
          <div className="flex items-center gap-2 mt-1">
            <Stars rating={doc.rating} />
            <span className="text-[11px] text-dim2">{doc.rating} · {doc.review_count} reviews</span>
          </div>
        </div>
        <span className={`ml-auto inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium ${STATUS_PILL[doc.status]}`}>
          {STATUS_LABEL[doc.status]}
        </span>
      </div>

      {/* Bio */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-dim mb-1.5">About</div>
        <p className="text-xs text-body leading-relaxed">{doc.bio}</p>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Languages",  value: doc.languages.join(", ") },
          { label: "Next available", value: doc.next_available },
          { label: "Sessions / week", value: String(doc.sessions_week) },
        ].map((m) => (
          <div key={m.label} className="rounded-md border border-line bg-elevated p-2.5">
            <div className="text-[10px] text-dim mb-0.5">{m.label}</div>
            <div className="text-xs text-body">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Reviews */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-dim mb-2">Recent Reviews</div>
        <div className="space-y-2">
          {doc.reviews.map((r, i) => <ReviewCard key={i} r={r} />)}
        </div>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const [depts, setDepts] = useState<Department[]>([]);
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);
  const [activeDocId,  setActiveDocId]  = useState<string | null>(null);

  useEffect(() => {
    getDepartments().then((d) => {
      setDepts(d);
      setActiveDeptId(d[0]?.id ?? null);
    }).catch(() => {});
  }, []);

  const activeDept = depts.find((d) => d.id === activeDeptId) ?? null;
  const activeDoc  = activeDept?.doctors.find((d) => d.id === activeDocId) ?? null;

  function selectDoc(id: string) {
    setActiveDocId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim2">Departments</div>

      {/* ── Department tabs ─────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {depts.map((d) => {
          const active = d.id === activeDeptId;
          return (
            <button
              key={d.id}
              onClick={() => { setActiveDeptId(d.id); setActiveDocId(null); }}
              className={`rounded-lg border p-4 text-left transition-all duration-150 ${
                active
                  ? "border-[var(--accent-border)] bg-[var(--accent-dim)]"
                  : "border-line bg-card hover:border-line2 hover:bg-elevated"
              }`}
            >
              <div className="text-xl mb-2">{d.icon}</div>
              <div className={`text-xs font-semibold ${active ? "text-body" : "text-dim2"}`}>{d.name}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-dim">{d.doctor_count} doctors</span>
                <span className="font-mono text-[10px] text-dim">{d.sessions_today} today</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Doctor grid + detail ─────────────────────────── */}
      {activeDept && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-body">{activeDept.name}</span>
            <span className="text-[10px] text-dim">· Head: {activeDept.head}</span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {activeDept.doctors.map((doc) => (
              <DoctorCard
                key={doc.id}
                doc={doc}
                active={doc.id === activeDocId}
                onSelect={() => selectDoc(doc.id)}
              />
            ))}
          </div>

          {/* Expanded profile */}
          {activeDoc && (
            <DoctorDetail doc={activeDoc} />
          )}
        </div>
      )}
    </div>
  );
}
