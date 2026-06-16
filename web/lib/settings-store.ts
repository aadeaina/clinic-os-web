import { create } from "zustand";

export type DataSource  = "staged" | "real";
export type AccentColor = "teal" | "blue" | "purple" | "amber";
export type Theme       = "dark" | "light";
export type Background  =
  | "default"
  | "gradient-tidal"
  | "gradient-dusk"
  | "gradient-stone"
  | "mesh"
  | "custom";

export const ACCENT_HEX: Record<AccentColor, string> = {
  teal:   "#14b8a6",
  blue:   "#3b82f6",
  purple: "#8b5cf6",
  amber:  "#f59e0b",
};

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return (JSON.parse(localStorage.getItem(`cos:${key}`) ?? "null") as T) ?? fallback; }
  catch { return fallback; }
}
function save(key: string, val: unknown) {
  if (typeof window !== "undefined") localStorage.setItem(`cos:${key}`, JSON.stringify(val));
}
function applyAccent(c: AccentColor) {
  if (typeof document !== "undefined")
    document.documentElement.setAttribute("data-accent", c);
}
function applyTheme(t: Theme) {
  if (typeof document !== "undefined")
    document.documentElement.setAttribute("data-theme", t);
}

interface SettingsState {
  dataSource:    DataSource;
  accentColor:   AccentColor;
  theme:         Theme;
  background:    Background;
  customBgImage: string | null;
  operatorName:  string;
  clinicName:    string;

  setDataSource:    (v: DataSource)   => void;
  setAccentColor:   (v: AccentColor)  => void;
  setTheme:         (v: Theme)        => void;
  setBackground:    (v: Background)   => void;
  setCustomBgImage: (v: string | null) => void;
  setOperatorName:  (v: string)       => void;
  setClinicName:    (v: string)       => void;
}

export const useSettings = create<SettingsState>((set) => ({
  dataSource:    load<DataSource>("dataSource",   "staged"),
  accentColor:   load<AccentColor>("accentColor", "teal"),
  theme:         load<Theme>("theme",             "dark"),
  background:    load<Background>("background",   "default"),
  customBgImage: load<string | null>("customBgImage", null),
  operatorName:  load("operatorName", "Operator"),
  clinicName:    load("clinicName",  "Riverside Medical"),

  setDataSource:  (v) => { save("dataSource",   v); set({ dataSource: v }); },
  setAccentColor: (v) => { save("accentColor",  v); set({ accentColor: v }); applyAccent(v); },
  setTheme:       (v) => { save("theme",        v); set({ theme: v });       applyTheme(v); },
  setBackground:  (v) => { save("background",   v); set({ background: v }); },
  setCustomBgImage:(v)=> { save("customBgImage", v); set({ customBgImage: v }); },
  setOperatorName:(v) => { save("operatorName", v); set({ operatorName: v }); },
  setClinicName:  (v) => { save("clinicName",   v); set({ clinicName: v }); },
}));

export function getApiBase(): string {
  const { dataSource } = useSettings.getState();
  if (dataSource === "staged") return "/api";
  return process.env.NEXT_PUBLIC_REAL_API_BASE ?? "http://localhost:8000/api";
}
