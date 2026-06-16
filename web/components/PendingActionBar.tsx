import { Step } from "@/lib/types";

export default function PendingActionBar({
  pending,
  onConfirm,
  onDiscard,
}: {
  pending: Step;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.07)] px-4 py-3">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-warn">
          Confirmation Required
        </div>
        <div className="mt-0.5 truncate text-xs text-body">{pending.summary}</div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={onDiscard}
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-dim transition-colors hover:border-line2 hover:text-dim2"
        >
          Discard
        </button>
        <button
          onClick={onConfirm}
          className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-surface transition-opacity hover:opacity-80"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
