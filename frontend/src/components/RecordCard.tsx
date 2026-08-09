import { useState } from 'react';
import { StatusBadge } from './StatusBadge';

export interface Attestation {
  record_id: number;
  submitter: string;
  task_description: string;
  evidence_url: string;
  deadline_iso: string;
  status: string;
  extracted_timestamp: string;
  resolved_epoch_seconds_diff: string;
}

interface RecordCardProps {
  attestation: Attestation;
  onResolve: (recordId: number) => Promise<{ hash: string; explorerUrl: string }>;
  disabled: boolean;
  disabledReason?: string;
}

function formatDiff(diffStr: string): string {
  if (!diffStr) return '';
  const diff = parseInt(diffStr, 10);
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  const label = parts.join(' ');
  return diff > 0 ? `${label} after deadline` : `${label} before deadline`;
}

export function RecordCard({ attestation, onResolve, disabled, disabledReason }: RecordCardProps) {
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [txInfo, setTxInfo] = useState<{ hash: string; explorerUrl: string } | null>(null);

  const handleResolve = async () => {
    setResolving(true);
    setResolveError(null);
    try {
      const result = await onResolve(attestation.record_id);
      setTxInfo(result);
    } catch (err: any) {
      setResolveError(err?.message || 'Resolution failed.');
      if (err?.explorerUrl) {
        setTxInfo({ hash: err.hash, explorerUrl: err.explorerUrl });
      }
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-xs text-textMuted">#{attestation.record_id}</span>
          <p className="mt-0.5 font-sans text-sm text-textPrimary">{attestation.task_description}</p>
        </div>
        <StatusBadge status={attestation.status} />
      </div>

      <dl className="space-y-1.5 font-mono text-xs">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-textMuted">evidence</dt>
          <dd className="truncate text-textPrimary">
            <a
              href={attestation.evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-verified hover:underline"
            >
              {attestation.evidence_url}
            </a>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-textMuted">deadline</dt>
          <dd className="text-textPrimary">{attestation.deadline_iso}</dd>
        </div>
        {attestation.extracted_timestamp && (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-textMuted">extracted</dt>
            <dd className="text-textPrimary">{attestation.extracted_timestamp}</dd>
          </div>
        )}
        {attestation.resolved_epoch_seconds_diff && (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-textMuted">diff</dt>
            <dd className="text-textPrimary">{formatDiff(attestation.resolved_epoch_seconds_diff)}</dd>
          </div>
        )}
      </dl>

      {attestation.status === 'submitted' && (
        <div className="mt-4 border-t border-borderSubtle pt-4">
          <button
            onClick={handleResolve}
            disabled={resolving || disabled}
            className="w-full rounded-md border border-border bg-surfaceRaised px-4 py-2 font-mono text-xs font-medium text-textPrimary transition-colors hover:border-verifiedDim/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {resolving ? 'Resolving…' : 'Resolve'}
          </button>
          <p className="mt-2 font-sans text-[11px] text-textMuted">
            This fetches the evidence and runs LLM-based extraction across validators — it can take
            several minutes to reach consensus. The button won't respond again until then; that's
            expected, not frozen.
          </p>
          {disabled && disabledReason && (
            <p className="mt-1.5 font-mono text-[11px] text-late">{disabledReason}</p>
          )}
        </div>
      )}

      {resolveError && <p className="mt-2 font-mono text-xs text-late">{resolveError}</p>}

      {txInfo && (
        <a
          href={txInfo.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block truncate font-mono text-[11px] text-verified hover:underline"
        >
          view transaction: {txInfo.hash}
        </a>
      )}
    </div>
  );
}
