interface KPIProps {
  label:  string;
  value:  string;
  sub?:   string;
  color?: string;
  trend?: "up" | "down" | "neutral";
}

export default function KPI({ label, value, sub, color, trend }: KPIProps) {
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-dim mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <div
          className="text-2xl font-semibold tabular-nums"
          style={{ color: color ?? "var(--accent)" }}
        >
          {value}
        </div>
        {trend && (
          <span
            className="text-[11px] font-semibold"
            style={{ color: trend === "up" ? "#14b8a6" : trend === "down" ? "#ef4444" : "#4a7070" }}
          >
            {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"}
          </span>
        )}
      </div>
      {sub && <div className="mt-1 text-[10px] text-dim">{sub}</div>}
    </div>
  );
}
