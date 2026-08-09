interface WalletButtonProps {
  account: string | null;
  connecting: boolean;
  connectError: string | null;
  hasWallet: boolean;
  onConnect: () => void;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton({ account, connecting, connectError, hasWallet, onConnect }: WalletButtonProps) {
  if (!hasWallet) {
    return (
      <span className="rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-textMuted">
        No wallet detected
      </span>
    );
  }

  if (account) {
    return (
      <span className="rounded-md border border-verifiedDim/40 bg-verified/10 px-3 py-1.5 font-mono text-xs text-verified">
        {truncateAddress(account)}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onConnect}
        disabled={connecting}
        className="rounded-md border border-border bg-surfaceRaised px-3 py-1.5 font-mono text-xs text-textPrimary transition-colors hover:border-verifiedDim/50 disabled:opacity-50"
      >
        {connecting ? 'Connecting…' : 'Connect wallet'}
      </button>
      {connectError && <span className="font-mono text-[11px] text-late">{connectError}</span>}
    </div>
  );
}
