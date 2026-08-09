export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <p className="font-mono text-4xl text-textMuted">404</p>
      <p className="mt-2 font-mono text-sm text-textMuted">Nothing extracted at this path.</p>
      <a
        href="/"
        className="mt-6 rounded-md border border-border bg-surface px-4 py-2 font-mono text-xs text-textPrimary hover:border-verifiedDim/50"
      >
        Back to Chronomark
      </a>
    </div>
  );
}
