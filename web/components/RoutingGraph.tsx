const AGENTS = [
  { id: "scheduling", label: "Scheduling" },
  { id: "intake",     label: "Intake"      },
  { id: "triage",     label: "Triage"      },
  { id: "billing",    label: "Billing"     },
];

export default function RoutingGraph({ active }: { active: string | null }) {
  return (
    <div className="rounded-lg border border-line bg-card p-3">
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.06em] text-dim">
        Intent Router
      </div>

      {/* Router node */}
      <div className="mb-2 flex justify-center">
        <div className="rounded-md border border-line2 bg-elevated px-4 py-1.5 text-xs font-semibold text-dim2">
          Router
        </div>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {AGENTS.map((a) => (
          <div
            key={a.id}
            className={`rounded-md border px-2 py-2 text-center text-[10px] font-medium transition-all duration-150 ${
              active === a.id
                ? "border-teal bg-[rgba(20,184,166,0.12)] text-teal"
                : "border-line bg-elevated text-dim"
            }`}
          >
            {a.label}
          </div>
        ))}
      </div>

      {/* Tool layer */}
      <div className="mt-2 rounded-md border border-line2 bg-elevated px-3 py-1.5 text-center text-[10px] text-dim2">
        Tool &amp; Guardrail Layer
      </div>
    </div>
  );
}
