import { useState, useEffect, useCallback } from 'react';
import { useGenLayer } from './hooks/useGenLayer';
import { NetworkToggle } from './components/NetworkToggle';
import { WalletButton } from './components/WalletButton';
import { SubmitForm } from './components/SubmitForm';
import { RecordCard, type Attestation } from './components/RecordCard';
import { Docs } from './pages/Docs';
import { NotFound } from './components/NotFound';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isDeployed, FAUCET_URL, type NetworkKey } from './config/chains';

function ChronomarkLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="#3FB950" strokeWidth="1.6" />
      <path d="M12 7v5l3.5 2" stroke="#3FB950" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Home() {
  const gl = useGenLayer();
  const [network, setNetwork] = useState<NetworkKey>('studionet');
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const deployed = isDeployed(network);

  const refreshList = useCallback(async () => {
    if (!deployed) {
      setAttestations([]);
      return;
    }
    setLoadingList(true);
    setListError(null);
    try {
      const nextIdRes = await gl.readContract(network, 'get_next_id', []);
      const nextId = nextIdRes.next_id as number;
      const ids = Array.from({ length: Math.max(0, nextId - 1) }, (_, i) => i + 1);
      const records = await Promise.all(
        ids.map(async (id) => {
          try {
            return (await gl.readContract(network, 'get_attestation', [id])) as Attestation;
          } catch {
            return null;
          }
        })
      );
      setAttestations(records.filter((r): r is Attestation => r !== null).reverse());
    } catch (err: any) {
      setListError(err?.message || 'Could not load attestations.');
    } finally {
      setLoadingList(false);
    }
  }, [gl, network, deployed]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const handleSubmit = async (taskDescription: string, evidenceUrl: string, deadlineIso: string) => {
    setSubmitStatus(null);
    await gl.writeContract(
      network,
      'submit_attestation',
      [taskDescription, evidenceUrl, deadlineIso],
      (status) => setSubmitStatus(status)
    );
    setSubmitStatus(null);
    await refreshList();
  };

  const handleResolve = async (recordId: number) => {
    const result = await gl.writeContract(network, 'resolve_attestation', [recordId]);
    await refreshList();
    return result;
  };

  const writeDisabledReason = !deployed
    ? `Chronomark isn't deployed on ${network === 'studionet' ? 'StudioNet' : 'Bradbury'} yet.`
    : !gl.account
    ? 'Connect a wallet to submit or resolve attestations.'
    : undefined;

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-borderSubtle">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
          <a href="/" className="flex items-center gap-2">
            <ChronomarkLogo />
            <span className="font-mono text-sm font-semibold text-textPrimary">chronomark</span>
          </a>
          <div className="flex items-center gap-3">
            <NetworkToggle network={network} onChange={setNetwork} />
            <WalletButton
              account={gl.account}
              connecting={gl.connecting}
              connectError={gl.connectError}
              hasWallet={gl.hasWallet}
              onConnect={gl.connect}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-mono text-lg font-semibold text-textPrimary">Deadline attestation</h1>
          <p className="mt-1.5 font-sans text-sm text-textMuted">
            Claim a completion time, cite a fixed evidence source, get an on-chain verified / late /
            unverifiable answer. No dispute, no staking — a verification utility.
          </p>
          {!deployed && (
            <p className="mt-3 rounded-md border border-lateDim/30 bg-late/5 px-3 py-2 font-mono text-xs text-late">
              Not yet deployed on {network === 'studionet' ? 'StudioNet' : 'Bradbury'}. Deploy via{' '}
              <a
                href="https://studio.genlayer.com/contracts"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                studio.genlayer.com
              </a>{' '}
              and set the address in your environment — see{' '}
              <a href="/docs" className="underline">
                docs
              </a>
              .
            </p>
          )}
        </div>

        <SubmitForm onSubmit={handleSubmit} disabled={!!writeDisabledReason} disabledReason={writeDisabledReason} />

        {submitStatus && (
          <p className="mt-3 font-mono text-xs text-textMuted">{submitStatus}…</p>
        )}

        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wide text-textMuted">
              Attestations
            </h2>
            {loadingList && <span className="font-mono text-xs text-textMuted">loading…</span>}
          </div>

          {listError && <p className="font-mono text-xs text-late">{listError}</p>}

          {!loadingList && deployed && attestations.length === 0 && (
            <div className="rounded-lg border border-dashed border-border px-5 py-8 text-center">
              <p className="font-mono text-xs text-textMuted">Nothing submitted yet on this network.</p>
            </div>
          )}

          <div className="space-y-4">
            {attestations.map((a) => (
              <RecordCard
                key={a.record_id}
                attestation={a}
                onResolve={handleResolve}
                disabled={!!writeDisabledReason}
                disabledReason={writeDisabledReason}
              />
            ))}
          </div>
        </div>

        <footer className="mt-16 flex items-center justify-between border-t border-borderSubtle pt-6 font-mono text-xs text-textMuted">
          <a href="/docs" className="hover:text-textPrimary">
            Docs
          </a>
          <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="hover:text-textPrimary">
            Testnet faucet
          </a>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  const path = window.location.pathname;

  return (
    <ErrorBoundary>
      {path === '/' && <Home />}
      {path === '/docs' && <Docs />}
      {path !== '/' && path !== '/docs' && <NotFound />}
    </ErrorBoundary>
  );
}
