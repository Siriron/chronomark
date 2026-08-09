import { useState } from 'react';

interface SubmitFormProps {
  onSubmit: (taskDescription: string, evidenceUrl: string, deadlineIso: string) => Promise<void>;
  disabled: boolean;
  disabledReason?: string;
}

export function SubmitForm({ onSubmit, disabled, disabledReason }: SubmitFormProps) {
  const [taskDescription, setTaskDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription.trim() || !evidenceUrl.trim() || !deadline) {
      setError('All three fields are required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // datetime-local gives a timezone-NAIVE string (e.g.
      // "2026-08-08T14:30") representing whatever the user typed in
      // their own local time — it has no attached offset. Stamping a
      // bare "Z" on it would silently and incorrectly reinterpret that
      // local-time intent as UTC. Instead, build a real Date from it
      // (which JS correctly treats as local time) and let toISOString()
      // do the actual UTC conversion using the browser's real offset —
      // this is the correctness-relevant fix, not a formatting nicety,
      // since a wrong offset here could flip a verified/late outcome.
      const localDate = new Date(deadline);
      const isoDeadline = localDate.toISOString();
      await onSubmit(taskDescription.trim(), evidenceUrl.trim(), isoDeadline);
      setTaskDescription('');
      setEvidenceUrl('');
      setDeadline('');
    } catch (err: any) {
      setError(err?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-surface p-6">
      <div>
        <label className="mb-1.5 block font-mono text-xs text-textMuted">task description</label>
        <input
          type="text"
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          placeholder="Ship the v2.1 release commit"
          maxLength={2000}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 font-sans text-sm text-textPrimary placeholder:text-textMuted/50 focus:border-verifiedDim/50"
        />
      </div>

      <div>
        <label className="mb-1.5 block font-mono text-xs text-textMuted">
          evidence url — commit api endpoint
        </label>
        <input
          type="url"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="https://api.github.com/repos/owner/repo/commits/main"
          maxLength={2000}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-textPrimary placeholder:text-textMuted/50 focus:border-verifiedDim/50"
        />
        <p className="mt-1.5 font-sans text-xs text-textMuted">
          GitHub's commit API returns a fixed JSON shape with a plain-text commit date — the contract
          fetches this itself, it isn't taking your word for it.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block font-mono text-xs text-textMuted">deadline</label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-textPrimary [color-scheme:dark] focus:border-verifiedDim/50"
        />
        <p className="mt-1.5 font-sans text-xs text-textMuted">
          Interpreted in your browser's local time, then stored as UTC — the contract compares against
          the fetched evidence in UTC regardless of where it's checked from.
        </p>
      </div>

      {error && <p className="font-mono text-xs text-late">{error}</p>}
      {disabled && disabledReason && (
        <p className="rounded-md border border-lateDim/30 bg-late/5 px-3 py-2 font-mono text-xs text-late">
          {disabledReason}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled || submitting}
        className="w-full rounded-md bg-verifiedDim px-4 py-2.5 font-mono text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? 'Submitting…' : 'Submit attestation'}
      </button>
    </form>
  );
}
