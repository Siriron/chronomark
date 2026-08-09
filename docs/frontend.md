# Frontend

React 18 + Vite + TypeScript + Tailwind CSS. React + Vite specifically (not Next.js) — both are accepted; `index.html` lives at the project root, not under `public/`, which Vite requires.

## Structure

```
src/
  App.tsx                 Root component, minimal path-based routing
  main.tsx                Entry point
  index.css               Global styles, font imports, reduced-motion handling
  hooks/
    useGenLayer.ts         All chain interaction — the only file that imports genlayer-js
  components/
    NetworkToggle.tsx      StudioNet/Bradbury switch (UI state only — see below)
    WalletButton.tsx       Wallet connect + persistent connection state
    SubmitForm.tsx         New attestation form
    RecordCard.tsx         Single attestation display + resolve action
    StatusBadge.tsx        verified/late/unverifiable/submitted visual vocabulary
    ErrorBoundary.tsx      Styled crash fallback
    NotFound.tsx           Styled 404
  config/
    chains.ts              Single source of truth for RPC/chainId/explorer/addresses
  pages/
    Docs.tsx                In-app documentation route
```

## Chain interaction (`useGenLayer.ts`)

This is the one file every write and read in the app routes through. Confirmed patterns implemented here:

- **Two-client split**: an unauthenticated client for reads, an account+provider-bound client for writes — matching the pattern shown in GenLayer's own current SDK documentation.
- **`provider: window.ethereum`** is required on the write client. Omitting it was a confirmed live bug elsewhere in this project's history (a transaction filed while one network was selected silently executed on a different one, because the wallet was never told to switch and the client had no bound provider to force it).
- **Network switching** uses `client.connect(networkName)` — the SDK's own documented method — as the primary path, with a manual `wallet_switchEthereumChain` / `wallet_addEthereumChain` sequence as a fallback if `connect()` is unavailable or throws. The switch happens immediately before a write, never on a network-toggle click alone, since switching the wallet's chain just from glancing at a different network's page would trigger an unwanted wallet popup.
- **Execution-result checking**: a transaction can reach `ACCEPTED` consensus status while its actual execution still failed. `writeContract` checks `txExecutionResultName` against `ExecutionResult.FINISHED_WITH_ERROR` before treating a write as successful — status alone isn't sufficient.
- **Generous, network-specific receipt polling** (StudioNet: 120 retries / 4s interval; Bradbury: 240 retries / 6s interval) — GenVM consensus, especially for a write that triggers an LLM extraction, genuinely takes real minutes. If polling times out, the app surfaces the explorer link directly rather than a bare error, since the transaction may have genuinely succeeded even though the frontend gave up waiting.
- **Persistent wallet connection**: on mount, silently checks `eth_accounts` (never `eth_requestAccounts`, which would prompt) to reconnect without a click if already authorized, and subscribes to `accountsChanged` to stay in sync.

## Design system

Grounded in the subject: this is a developer-facing verification tool built around git commit timestamps, so the visual language borrows directly from a git diff viewer rather than a generic dark theme — `#0D1117` background, `#3FB950` for `verified` (git's own added-line green, not a generic accent), `#F0883E` for `late`, a muted `#6E7681` for `unverifiable` (an honest "we don't know," not styled as a failure state). JetBrains Mono carries every timestamp, hash, and address; Inter carries body copy.

Layout is deliberately a single-purpose tool page — submit form, then resolved records — not a marketing landing-page scroll. That's a departure from this project's usual cinematic-landing-page default, justified because Chronomark is a utility a person returns to and uses repeatedly, not a one-time narrative pitch.

## Known limitations

- No `tsc` typecheck has been run against this code in a real environment with the actual `genlayer-js`/`react`/`viem` type packages installed — the build environment used to write this had no package registry access. The code has passed a syntax-level audit (import resolution, brace balance, Rules-of-Hooks scripted check) but not a real compiler pass.
- The GitHub commit API framing in `SubmitForm.tsx`'s placeholder text is a suggestion, not an enforced constraint — the contract and frontend both accept any fetchable URL.
