import { useState, useEffect, useCallback } from 'react';
import { createClient } from 'genlayer-js';
import { studionet, testnetBradbury } from 'genlayer-js/chains';
import { TransactionStatus, ExecutionResult } from 'genlayer-js/types';
import type { NetworkKey } from '../config/chains';
import { CHAIN_CONFIGS, RECEIPT_CONFIG, CONTRACT_ADDRESSES } from '../config/chains';

const CHAIN_OBJECTS = {
  studionet,
  bradbury: testnetBradbury,
};

// genlayer-js's own connect() name for each network, per the SDK-name
// list confirmed on docs.genlayer.com/api-references/genlayer-js
// ("localnet", "studionet", "testnetAsimov", "testnetBradbury").
const SDK_NETWORK_NAMES: Record<NetworkKey, string> = {
  studionet: 'studionet',
  bradbury: 'testnetBradbury',
};

// Manual EIP-3326 chain-switch sequence — confirmed working via Sigil's
// actual shipped code (project knowledge section 7). Kept as a FALLBACK
// behind client.connect() below: the current docs.genlayer.com page
// documents client.connect(networkName) as the primary, SDK-native way
// to switch the wallet, and states the SDK throws a clear chain-mismatch
// error if skipped — but Sigil's manual sequence predates that
// documentation and is independently confirmed against a real accepted
// deployment, so it stays as a defensive fallback rather than being
// deleted outright per the project's "don't declare victory on one
// plausible fix" methodology.
async function manualEnsureChain(network: NetworkKey) {
  const eth = (window as any).ethereum;
  if (!eth) return;
  const cfg = CHAIN_CONFIGS[network];
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: cfg.chainId }] });
  } catch (err: any) {
    if (err && err.code === 4902) {
      await eth.request({ method: 'wallet_addEthereumChain', params: [cfg] });
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: cfg.chainId }] });
    } else if (err && err.code === -32002) {
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      throw err;
    }
  }
}

export interface UseGenLayerResult {
  account: string | null;
  connecting: boolean;
  connectError: string | null;
  connect: () => Promise<void>;
  hasWallet: boolean;
  readContract: (network: NetworkKey, method: string, args: any[]) => Promise<any>;
  writeContract: (
    network: NetworkKey,
    method: string,
    args: any[],
    onStatus?: (status: string) => void
  ) => Promise<{ hash: string; explorerUrl: string }>;
}

export function useGenLayer(): UseGenLayerResult {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const hasWallet = typeof window !== 'undefined' && !!(window as any).ethereum;

  // Persistent connection + stay-in-sync pattern, confirmed section 7.
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    eth
      .request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (accounts[0]) setAccount(accounts[0]);
      })
      .catch(() => {});
    const handleAccountsChanged = (accounts: string[]) => setAccount(accounts[0] || null);
    if (eth.on) eth.on('accountsChanged', handleAccountsChanged);
    return () => {
      if (eth.removeListener) eth.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = (window as any).ethereum;
    if (!eth) {
      setConnectError('No wallet extension detected.');
      return;
    }
    setConnecting(true);
    setConnectError(null);
    try {
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts[0]) setAccount(accounts[0]);
    } catch (err: any) {
      setConnectError(err?.message || 'Connection was declined.');
    } finally {
      setConnecting(false);
    }
  }, []);

  const readContract = useCallback(async (network: NetworkKey, method: string, args: any[]) => {
    const address = CONTRACT_ADDRESSES[network];
    if (!address) throw new Error(`Chronomark is not yet deployed on ${network}.`);
    const client = createClient({ chain: CHAIN_OBJECTS[network] });
    const raw = await client.readContract({
      address: address as `0x${string}`,
      functionName: method,
      args,
    });
    // readContract returns a JSON string — always parse it, confirmed
    // section 7.
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, []);

  const writeContract = useCallback(
    async (network: NetworkKey, method: string, args: any[], onStatus?: (status: string) => void) => {
      const address = CONTRACT_ADDRESSES[network];
      if (!address) throw new Error(`Chronomark is not yet deployed on ${network}.`);
      const eth = (window as any).ethereum;
      if (!eth) throw new Error('No wallet extension detected.');
      if (!account) throw new Error('Wallet is not connected.');

      const client = createClient({
        chain: CHAIN_OBJECTS[network],
        account: account as `0x${string}`,
        provider: eth, // required — confirmed section 7, Sigil's useGenLayer.js
      });

      onStatus?.('Switching network…');
      // Primary path: the SDK's own documented connect() method
      // (docs.genlayer.com/api-references/genlayer-js). Falls back to
      // the manual EIP-3326 sequence if connect() isn't present on this
      // SDK version or itself throws — never leaves the wallet
      // unswitched, since writeContract legitimately fails with a
      // chain-mismatch error otherwise.
      let switched = false;
      if (typeof (client as any).connect === 'function') {
        try {
          await (client as any).connect(SDK_NETWORK_NAMES[network]);
          switched = true;
        } catch {
          switched = false;
        }
      }
      if (!switched) {
        await manualEnsureChain(network);
      }

      onStatus?.('Waiting for wallet confirmation…');
      const hash = await client.writeContract({
        address: address as `0x${string}`,
        functionName: method,
        args,
        value: BigInt(0), // required even when unused, confirmed section 7
      });

      onStatus?.('Waiting for consensus…');
      const receiptConfig = RECEIPT_CONFIG[network];
      let receipt: any = null;
      try {
        receipt = await client.waitForTransactionReceipt({
          hash,
          status: TransactionStatus.ACCEPTED,
          retries: receiptConfig.retries,
          interval: receiptConfig.interval,
        });
      } catch (err) {
        // Timeout doesn't necessarily mean failure — the transaction may
        // have genuinely succeeded even though the frontend gave up
        // waiting. Surface the explorer link rather than a bare error.
        onStatus?.('timeout');
      }

      const explorerUrl = `${CHAIN_CONFIGS[network].blockExplorerUrls[0]}/tx/${hash}`;

      // A transaction can be finalized by consensus but still have a
      // failed EXECUTION — confirmed on docs.genlayer.com's own
      // "Checking execution results" section. Don't assume ACCEPTED
      // status alone means the write succeeded; surface execution
      // failure distinctly so the UI doesn't show a false-success state.
      if (receipt && receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR) {
        const err: any = new Error(
          'The transaction reached consensus but execution failed on-chain. Check the explorer link for details.'
        );
        err.hash = hash;
        err.explorerUrl = explorerUrl;
        err.executionFailed = true;
        throw err;
      }

      return { hash, explorerUrl };
    },
    [account]
  );

  return { account, connecting, connectError, connect, hasWallet, readContract, writeContract };
}
