# Architecture

## Overview

Chronomark is a two-piece system: a single GenVM contract and a React/Vite frontend that talks to it directly. There's no backend server and no database — all state lives on-chain in the contract's own storage.

```
┌─────────────────┐         readContract          ┌──────────────────────┐
│                  │  ─────────────────────────►   │                      │
│  React Frontend  │                                │   Chronomark         │
│  (Vite, no SSR)  │  ◄─────────────────────────    │   GenVM Contract     │
│                  │         writeContract          │   (StudioNet /       │
└──────────────────┘                                │    Bradbury)         │
         │                                           └───────────┬──────────┘
         │ wallet (MetaMask / window.ethereum)                    │
         ▼                                                        │ gl.nondet.web.get()
┌──────────────────┐                                              ▼
│   User's wallet   │                                   ┌──────────────────────┐
└──────────────────┘                                   │  Evidence source      │
                                                          │  (e.g. GitHub commit  │
                                                          │  API endpoint)        │
                                                          └──────────────────────┘
```

## Frontend

React 18 + Vite + TypeScript + Tailwind CSS. Two routes, handled without a router library since the app is genuinely this small: `/` (the tool itself) and `/docs` (this documentation). Routing is a plain `window.location.pathname` check in `App.tsx` — adding a router dependency for two static routes would be unjustified complexity for what this app actually needs.

State is entirely client-side and re-derived from chain reads on load and after every write; there is no client-side cache layer or global state library. `useGenLayer` (in `src/hooks/useGenLayer.ts`) is the single point of contact with the chain — every read and write in the app goes through it.

## Contract

`contracts/chronomark.py`. One storage type (`Attestation`), one `TreeMap` keyed by record ID, two write methods, two view methods. See [`contracts.md`](./contracts.md) for the full method reference and [`../contracts/chronomark.py`](../contracts/chronomark.py)'s own module docstring for the complete design rationale behind the extraction/comparison split.

## Why no backend

Every piece of state this app needs already lives on-chain and is readable via `readContract`. A backend would only add a second source of truth to keep in sync with the contract, for no benefit this app actually needs at its current scope.

## Data flow for a resolution

1. Frontend calls `resolve_attestation(record_id)` via `writeContract`.
2. Contract's `leader_fn` fetches the evidence URL via `gl.nondet.web.get()`, sanitizes the result, and asks an LLM to extract an ISO-8601 timestamp — nothing else.
3. Independent validators run `validator_fn`, which re-executes the same extraction and requires an exact match on the extracted timestamp, then independently re-parses both timestamps to confirm they agree on the same underlying instant, not just the same string.
4. Once consensus is reached, `run_nondet_unsafe` returns the agreed extraction result to plain deterministic code.
5. The contract compares the extracted timestamp against the stored deadline — this comparison never runs inside the nondet block — and writes the final `verified` / `late` / `unverifiable` status.
6. Frontend polls for the transaction receipt, checks `txExecutionResultName` to confirm the write actually succeeded (not just that consensus was reached), and re-reads the record.
