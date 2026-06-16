import { useState } from "react";
import { Step } from "@/lib/types";

export default function ToolCallCard({ use, result }: { use: Step; result?: Step }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-line bg-elevated p-3 text-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between"
      >
        <span className="font-medium text-teal">⚙ {use.tool}</span>
        <span className="font-mono text-[10px] text-dim">
          {result ? "result" : "running…"} {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <pre className="mt-2 overflow-x-auto rounded-md border border-line bg-card p-2 font-mono text-[10px] text-dim2">
          {JSON.stringify({ input: use.input, output: result?.output }, null, 2)}
        </pre>
      )}
    </div>
  );
}
