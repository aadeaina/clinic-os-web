export default function StatCards({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border border-line bg-card p-4">
          <div className="text-2xl font-semibold tabular-nums text-teal">{it.value}</div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-dim">
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}
