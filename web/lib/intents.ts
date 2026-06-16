export const INTENT_LABELS: Record<string, string> = {
  scheduling: "Appointment scheduling",
  intake:     "Patient intake",
  triage:     "Clinical triage",
  billing:    "Billing & insurance",
  smalltalk:  "General inquiry",
};

export const INTENT_COLORS: Record<string, string> = {
  scheduling: "#14b8a6",
  billing:    "#2DD4BF",
  intake:     "#3b82f6",
  triage:     "#ef4444",
  smalltalk:  "#4a7070",
};

export function intentLabel(key: string): string {
  return INTENT_LABELS[key] ?? key;
}
