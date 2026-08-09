import type { NetworkKey } from '../config/chains';

interface NetworkToggleProps {
  network: NetworkKey;
  onChange: (network: NetworkKey) => void;
}

export function NetworkToggle({ network, onChange }: NetworkToggleProps) {
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-surface p-0.5 font-mono text-xs">
      {(['studionet', 'bradbury'] as NetworkKey[]).map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded px-3 py-1.5 transition-colors ${
            network === key
              ? 'bg-surfaceRaised text-textPrimary'
              : 'text-textMuted hover:text-textPrimary'
          }`}
        >
          {key === 'studionet' ? 'StudioNet' : 'Bradbury'}
        </button>
      ))}
    </div>
  );
}
