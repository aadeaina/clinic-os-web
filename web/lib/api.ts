import { Step, SessionRow, AnalyticsSummary } from "./types";
import { getApiBase } from "./settings-store";

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${getApiBase()}${path}`);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}
async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${path} → ${r.status}`);
  return r.json();
}

// ── Core session API ──────────────────────────────────────────────────────────

export async function postEvent(input: {
  clinic_id: string; channel: string; patient_ref: string; text: string; session_id?: string;
}): Promise<{ session_id: string }> {
  return post("/events", input);
}

export function streamSession(sessionId: string, onStep: (s: Step) => void, onDone: () => void) {
  const es = new EventSource(`${getApiBase()}/sessions/${sessionId}/stream`);
  es.onmessage = (e) => { try { onStep(JSON.parse(e.data)); } catch {} };
  es.addEventListener("done", () => { es.close(); onDone(); });
  es.onerror = () => { es.close(); onDone(); };
  return () => es.close();
}

export async function confirmAction(sessionId: string, actionId: string): Promise<{ steps: Step[] }> {
  return post(`/sessions/${sessionId}/confirm`, { action_id: actionId });
}

export async function listSessions():    Promise<SessionRow[]>     { return get("/sessions"); }
export async function getAnalytics():    Promise<AnalyticsSummary> { return get("/analytics/summary"); }
export async function getAnalyticsDetail(): Promise<AnalyticsDetail> { return get("/analytics/detail"); }

// ── New domain APIs ───────────────────────────────────────────────────────────

export async function getBilling():     Promise<BillingSummary>  { return get("/billing"); }
export async function getDepartments(): Promise<Department[]>    { return get("/departments"); }
export async function getLabs():        Promise<LabsSummary>     { return get("/labs"); }

// ── Response types ────────────────────────────────────────────────────────────

export interface AnalyticsDetail {
  daily_volume: { date: string; sessions: number; contained: number; escalated: number }[];
  hourly:       { hour: string; sessions: number }[];
  weekly:       { day: string; sessions: number }[];
  response_times: { bucket: string; count: number }[];
  channel_mix:  { channel: string; count: number }[];
  containment_trend: { date: string; rate: number; escalation_rate: number }[];
}

export interface Claim {
  id: string; patient: string; insurance: string;
  amount: number; status: "paid" | "pending" | "denied" | "processing";
  service: string; date: string;
}
export interface BillingSummary {
  total_billed_mtd:  number;
  collected_mtd:     number;
  outstanding:       number;
  pending_claims:    number;
  collection_rate:   number;
  claims:            Claim[];
  by_insurance:      { insurer: string; amount: number }[];
  revenue_by_dept:   { dept: string; revenue: number }[];
  monthly_trend:     { month: string; billed: number; collected: number }[];
}

export interface Review {
  author: string; rating: number; date: string; text: string;
}
export interface Doctor {
  id: string; name: string; title: string; specialty: string;
  initials: string; color: string;
  rating: number; review_count: number; sessions_week: number;
  status: "available" | "busy" | "away" | "off";
  years_exp: number; languages: string[];
  next_available: string; bio: string;
  reviews: Review[];
}
export interface Department {
  id: string; name: string; icon: string;
  head: string; doctor_count: number; sessions_today: number;
  doctors: Doctor[];
}

export interface LabOrder {
  id: string; patient: string; test: string; ordered_by: string;
  ordered: string; priority: "routine" | "urgent" | "stat";
  status: "pending" | "in_progress" | "complete";
}
export interface LabResult {
  id: string; patient: string; test: string; result: string;
  flag: "normal" | "high" | "low" | "critical"; reviewed: string;
  reviewed_by: string;
}
export interface LabsSummary {
  pending_orders:  number;
  urgent:          number;
  results_ready:   number;
  reviewed_today:  number;
  orders:          LabOrder[];
  results:         LabResult[];
  by_test_type:    { test: string; count: number }[];
}
