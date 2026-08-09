type Status = 'submitted' | 'verified' | 'late' | 'unverifiable';

const STATUS_CONFIG: Record<Status, { label: string; className: string; symbol: string }> = {
  submitted: {
    label: 'awaiting resolution',
    className: 'text-textMuted border-border bg-surface',
    symbol: '○',
  },
  verified: {
    label: 'verified',
    className: 'text-verified border-verifiedDim/40 bg-verified/10',
    symbol: '✓',
  },
  late: {
    label: 'late',
    className: 'text-late border-lateDim/40 bg-late/10',
    symbol: '△',
  },
  unverifiable: {
    label: 'unverifiable',
    className: 'text-unverifiable border-unverifiable/40 bg-unverifiable/10',
    symbol: '–',
  },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as Status] ?? STATUS_CONFIG.submitted;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs font-medium ${cfg.className}`}
    >
      <span aria-hidden="true">{cfg.symbol}</span>
      {cfg.label}
    </span>
  );
}
