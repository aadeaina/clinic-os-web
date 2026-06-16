const PALETTE: Record<string, { bg: string; text: string; border: string }> = {
  scheduling: { bg: "rgba(20,184,166,0.12)",  text: "#14b8a6", border: "rgba(20,184,166,0.3)"  },
  intake:     { bg: "rgba(45,212,191,0.12)",  text: "#2DD4BF", border: "rgba(45,212,191,0.3)"  },
  triage:     { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b", border: "rgba(245,158,11,0.3)"  },
  billing:    { bg: "rgba(13,115,119,0.20)",  text: "#7aa8a0", border: "rgba(13,115,119,0.4)"  },
  smalltalk:  { bg: "rgba(74,112,112,0.12)",  text: "#7aa8a0", border: "rgba(74,112,112,0.3)"  },
};

export default function AgentBadge({ agent }: { agent: string }) {
  const c = PALETTE[agent] ?? PALETTE.smalltalk;
  return (
    <span
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium"
    >
      {agent}
    </span>
  );
}
