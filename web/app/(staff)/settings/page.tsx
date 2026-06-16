"use client";
import { useState, useRef, useEffect, ChangeEvent } from "react";
import {
  useSettings,
  AccentColor,
  DataSource,
  Theme,
  Background,
  ACCENT_HEX,
} from "@/lib/settings-store";
import type { AuthUser } from "@/lib/auth";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-card p-5 space-y-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim2 border-b border-line pb-2">{title}</div>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-dim2 mb-1.5">{label}</div>
      {children}
    </div>
  );
}

const ACCENT_OPTIONS: { value: AccentColor; label: string }[] = [
  { value: "teal", label: "Teal" }, { value: "blue", label: "Blue" },
  { value: "purple", label: "Purple" }, { value: "amber", label: "Amber" },
];

const BG_OPTIONS: { value: Background; label: string; preview: string }[] = [
  { value: "default",         label: "Default",  preview: "" },
  { value: "gradient-tidal",  label: "Tidal",    preview: "linear-gradient(135deg, #051122 0%, #0a2240 30%, #0D7377 100%)" },
  { value: "gradient-dusk",   label: "Dusk",     preview: "linear-gradient(135deg, #1a0a2e 0%, #2d1b69 50%, #0c1414 100%)" },
  { value: "gradient-stone",  label: "Stone",    preview: "linear-gradient(180deg, #1c1c1e 0%, #2c2c2e 60%, #1a1a2a 100%)" },
  { value: "mesh",            label: "Mesh",     preview: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(13,115,119,0.7) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 90%, rgba(20,184,166,0.5) 0%, transparent 55%), #0c1414" },
  { value: "custom",          label: "Upload",   preview: "" },
];

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1920;
      let { width, height } = img;
      if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
      if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed")); };
    img.src = url;
  });
}

export default function SettingsPage() {
  const {
    dataSource, setDataSource, accentColor, setAccentColor,
    theme, setTheme, background, setBackground, customBgImage, setCustomBgImage,
    operatorName, setOperatorName, clinicName, setClinicName,
  } = useSettings();

  const [authUser, setAuthUser]       = useState<AuthUser | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [localOpName, setLocalOpName]         = useState(operatorName);
  const [localClinicName, setLocalClinicName] = useState(clinicName);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null)
      .then((d: { user?: AuthUser } | null) => { if (d?.user) setAuthUser(d.user); })
      .catch(() => {});
  }, []);

  function showSaved() { setSavedBanner(true); setTimeout(() => setSavedBanner(false), 2000); }
  function saveProfile() { setOperatorName(localOpName); setClinicName(localClinicName); showSaved(); }

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadError("Select an image file."); return; }
    setUploadError(""); setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      setCustomBgImage(dataUrl); setBackground("custom");
    } catch { setUploadError("Failed to process image."); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  const isAdmin = authUser?.role === "admin";

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim2">Settings</div>
        {savedBanner && (
          <div className="rounded-md border px-3 py-1 text-[11px]"
            style={{ background: "var(--accent-dim)", borderColor: "var(--accent-border)", color: "var(--accent)" }}>
            Saved
          </div>
        )}
      </div>

      {/* ── Theme mode ── */}
      <Section title="Theme Mode">
        <div className="flex gap-3">
          {([
            { value: "dark" as Theme, label: "Dark", icon: "🌙" },
            { value: "light" as Theme, label: "Light", icon: "☀️" },
          ]).map((opt) => {
            const active = theme === opt.value;
            return (
              <button key={opt.value} onClick={() => setTheme(opt.value)}
                className="flex flex-1 flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-150"
                style={active
                  ? { borderColor: "var(--accent-border)", background: "var(--accent-dim)" }
                  : { borderColor: "rgb(var(--col-line))", background: "rgb(var(--col-elevated))" }
                }
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="text-xs font-semibold" style={{ color: active ? "rgb(var(--col-body))" : "rgb(var(--col-dim2))" }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Background ── */}
      <Section title="Background">
        <p className="text-xs text-dim -mt-1">Choose a preset or upload a custom image.</p>
        <div className="grid grid-cols-3 gap-2.5">
          {BG_OPTIONS.map((opt) => {
            const active   = background === opt.value;
            const isCustom = opt.value === "custom";
            return (
              <button key={opt.value}
                onClick={() => isCustom ? fileRef.current?.click() : setBackground(opt.value)}
                className="flex flex-col gap-1.5 rounded-xl border p-1.5 transition-all duration-150"
                style={active
                  ? { borderColor: "var(--accent)" }
                  : { borderColor: "rgb(var(--col-line))" }
                }
              >
                <div className="h-14 w-full rounded-lg overflow-hidden relative flex items-center justify-center"
                  style={isCustom && customBgImage && active
                    ? {}
                    : opt.value === "default"
                    ? { background: "rgb(var(--col-surface))", border: "1px solid rgb(var(--col-line))" }
                    : isCustom
                    ? { background: "rgb(var(--col-elevated))", border: "2px dashed rgb(var(--col-line2))" }
                    : { backgroundImage: opt.preview, backgroundSize: "cover" }
                  }
                >
                  {isCustom && customBgImage && active
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={customBgImage} alt="" className="h-full w-full object-cover" />
                    : isCustom
                    ? <span className="text-dim text-lg">+</span>
                    : null}
                  {active && !isCustom && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ background: "var(--accent)" }}>✓</div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium text-center w-full"
                  style={{ color: active ? "rgb(var(--col-body))" : "rgb(var(--col-dim))" }}>
                  {isCustom ? (uploading ? "Uploading…" : "Upload") : opt.label}
                </span>
              </button>
            );
          })}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        {uploadError && <p className="text-xs text-danger">{uploadError}</p>}
        {background === "custom" && customBgImage && (
          <button onClick={() => { setCustomBgImage(null); setBackground("default"); }}
            className="text-[11px] text-dim hover:text-danger transition-colors">
            Remove custom image
          </button>
        )}
      </Section>

      {/* ── Accent colour ── */}
      <Section title="Appearance">
        <FieldRow label="Accent colour">
          <div className="flex gap-2.5">
            {ACCENT_OPTIONS.map((opt) => {
              const active = accentColor === opt.value;
              const hex    = ACCENT_HEX[opt.value];
              return (
                <button key={opt.value} onClick={() => setAccentColor(opt.value)} title={opt.label}
                  className="flex flex-col items-center gap-1.5">
                  <div className="h-8 w-8 rounded-lg transition-all duration-150"
                    style={{ background: hex, outline: active ? `2px solid ${hex}` : "none", outlineOffset: "2px", opacity: active ? 1 : 0.45 }} />
                  <span className={`text-[9px] font-medium ${active ? "text-body" : "text-dim"}`}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </FieldRow>
      </Section>

      {/* ── Data Source — admin only ── */}
      {isAdmin && (
        <Section title="Data Source">
          <p className="text-xs text-dim -mt-1">Visible to administrators only. Changes the API the application calls.</p>
          <div className="space-y-2">
            {([
              { value: "staged" as DataSource, label: "Staged (Mock)", desc: "Built-in mock routes. No backend required." },
              { value: "real"   as DataSource, label: "Real (API)",    desc: "Connects to the live Django backend." },
            ]).map((opt) => {
              const active = dataSource === opt.value;
              return (
                <button key={opt.value} onClick={() => setDataSource(opt.value)}
                  className="w-full text-left rounded-lg border p-3.5 transition-all duration-150"
                  style={active
                    ? { borderColor: "var(--accent-border)", background: "var(--accent-dim)" }
                    : { borderColor: "rgb(var(--col-line))", background: "rgb(var(--col-elevated))" }
                  }
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: active ? "var(--accent)" : "rgb(var(--col-line2))" }}>
                      {active && <div className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />}
                    </div>
                    <span className={`text-xs font-semibold ${active ? "text-body" : "text-dim2"}`}>{opt.label}</span>
                    {opt.value === "staged" && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>default</span>
                    )}
                  </div>
                  <p className="text-[11px] text-dim pl-6">{opt.desc}</p>
                </button>
              );
            })}
          </div>
          <div className="rounded-md border border-line bg-elevated p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-dim mb-1">Real API base URL</div>
            <div className="font-mono text-[11px] text-dim2">
              {process.env.NEXT_PUBLIC_REAL_API_BASE ?? "http://localhost:8000/api"}
            </div>
          </div>
        </Section>
      )}

      {/* ── Operator Profile ── */}
      <Section title="Operator Profile">
        <FieldRow label="Display name">
          <input value={localOpName} onChange={(e) => setLocalOpName(e.target.value)}
            className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-xs text-body placeholder-dim outline-none focus:border-teal transition-colors"
            placeholder="Your name" />
        </FieldRow>
        <FieldRow label="Clinic name">
          <input value={localClinicName} onChange={(e) => setLocalClinicName(e.target.value)}
            className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-xs text-body placeholder-dim outline-none focus:border-teal transition-colors"
            placeholder="Clinic name" />
          <p className="mt-1 text-[10px] text-dim">Shown in the sidebar wordmark.</p>
        </FieldRow>
        <button onClick={saveProfile}
          className="rounded-lg px-4 py-2 text-xs font-semibold text-surface transition-opacity hover:opacity-80"
          style={{ background: "var(--accent)" }}>
          Save profile
        </button>
      </Section>

      {/* ── About ── */}
      <Section title="About">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Version",    value: "0.1.0" },
            { label: "Framework",  value: "Next.js 14" },
            { label: "Stack",      value: "Tailwind · Zustand · Recharts" },
            { label: "LLM router", value: "Claude Haiku 4.5" },
          ].map((r) => (
            <div key={r.label}>
              <div className="text-[10px] text-dim">{r.label}</div>
              <div className="text-xs text-body">{r.value}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
