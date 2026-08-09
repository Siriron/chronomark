// All network + contract configuration lives here. Never hardcode an RPC
// URL, chain ID, explorer link, or contract address anywhere else in the
// app — import from this file instead.

export type NetworkKey = 'studionet' | 'bradbury';

export interface ChainConfig {
  chainId: string; // hex, e.g. '0xF22F'
  chainIdDecimal: number;
  chainName: string;
  rpcUrls: string[];
  nativeCurrency: { name: string; symbol: string; decimals: number };
  blockExplorerUrls: string[];
}

// Confirmed working values — see project knowledge section 7's Network
// config table.
export const CHAIN_CONFIGS: Record<NetworkKey, ChainConfig> = {
  bradbury: {
    chainId: '0x107D', // 4221
    chainIdDecimal: 4221,
    chainName: 'GenLayer Bradbury',
    rpcUrls: ['https://rpc-bradbury.genlayer.com'],
    nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
    blockExplorerUrls: ['https://explorer-bradbury.genlayer.com'],
  },
  studionet: {
    chainId: '0xF22F', // 61999
    chainIdDecimal: 61999,
    chainName: 'GenLayer StudioNet',
    rpcUrls: ['https://studio.genlayer.com/api'],
    nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
    blockExplorerUrls: ['https://explorer-studio.genlayer.com'],
  },
};

// receipt-wait tuning — GenLayer consensus genuinely takes real minutes,
// not seconds, especially for a write that triggers an LLM call. Confirmed
// values, project knowledge section 7.
export const RECEIPT_CONFIG: Record<NetworkKey, { retries: number; interval: number }> = {
  studionet: { retries: 120, interval: 4000 },
  bradbury: { retries: 240, interval: 6000 },
};

// Deployed Aug 8 2026. One live resolution has been confirmed end-to-end
// on StudioNet (a submit_attestation + resolve_attestation cycle against
// a real GitHub commit API fetch, reaching "verified" with the extracted
// timestamp matching the live evidence exactly — see docs/deployment.md
// for the full transaction detail). The "late" and "unverifiable" paths
// are implemented and pass the full static section 4 nondet audit, but
// have not yet been exercised live — see docs/deployment.md's testing
// status section before treating them as proven.
//
// Addresses default to the real deployed values below; VITE_CONTRACT_
// ADDRESS_* env vars override these if set (e.g. for a future redeploy
// without touching source).
export const CONTRACT_ADDRESSES: Record<NetworkKey, string> = {
  studionet: import.meta.env.VITE_CONTRACT_ADDRESS_STUDIONET || '0x021DB40165dB2D51233118fCe0cBC1ae0Cdfe9Ae',
  bradbury: import.meta.env.VITE_CONTRACT_ADDRESS_BRADBURY || '0x88c95f9a63d69C55f9089f9bCC9B3916e0568e59',
};

export function isDeployed(network: NetworkKey): boolean {
  return CONTRACT_ADDRESSES[network].length > 0;
}

export const FAUCET_URL = 'https://testnet-faucet.genlayer.foundation';
