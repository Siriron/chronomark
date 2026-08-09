# Deployment

## Prerequisites

- A GenLayer Studio account at [studio.genlayer.com](https://studio.genlayer.com)
- A wallet with testnet GEN on StudioNet and/or Bradbury — use the [faucet](https://testnet-faucet.genlayer.foundation) for Bradbury
- Node.js ≥ 18, npm ≥ 9

## 1. Deploy the contract

1. Go to [studio.genlayer.com/contracts](https://studio.genlayer.com/contracts).
2. Upload `contracts/chronomark.py` directly — **never paste the code in, upload the file**. Pasting has previously produced silent deploy inconsistencies in this project's build history.
3. Deploy. **Never use a MetaMask/EVM-wallet-initiated deploy** — this is consistently rejected by Studio. Deploy through the Studio UI only.
4. Copy the resulting contract address and the deploy transaction link from the explorer.
5. Repeat for the second network (StudioNet and Bradbury are separate deployments with separate addresses).

## 2. Verify the contract before wiring up the frontend

Before touching the frontend at all, use Studio's own **Run and Debug** panel (`studio.genlayer.com/run-debug`) to exercise every method directly:

- Call `submit_attestation` with a real evidence URL (a GitHub commit API endpoint works well — e.g. `https://api.github.com/repos/<owner>/<repo>/commits/<sha>`) and a deadline before and after the commit's actual timestamp, to exercise both `verified` and `late` outcomes.
- Call `submit_attestation` with a deliberately broken evidence URL (an `.invalid`-TLD URL, which is IETF-reserved to never resolve — not an arbitrary "looks broken" domain, since some placeholder domains resolve to real content and would produce a misleading test) to exercise the `unverifiable` outcome.
- Call `resolve_attestation` on each and confirm clean stderr — no pickling warnings, no unhandled exceptions.
- Confirm `get_attestation` returns the expected `extracted_timestamp` and `resolved_epoch_seconds_diff` for the verified/late cases.

Only move to frontend wiring once this is confirmed clean. As of this writing, `verified` has been confirmed exactly this way — see the Status section below and the Testing status section for the full transaction detail. `late` and `unverifiable` have not yet been exercised the same way.

## 3. Configure the frontend

Set the deployed addresses as environment variables. Either:

**Option A — Vercel project environment variables** (recommended; these are public contract addresses, not secrets):
- `VITE_CONTRACT_ADDRESS_STUDIONET`
- `VITE_CONTRACT_ADDRESS_BRADBURY`

**Option B — local `.env` file** (copy `.env.example` to `.env` and fill in real values). Vite loads `.env`/`.env.local` automatically; it never loads `.env.example`.

## 4. Run locally

```bash
cd frontend
npm install
npm run dev
```

## 5. Deploy the frontend

Push to a GitHub repo, connect it to Vercel, set the environment variables from step 3 in the Vercel project settings, deploy. `vercel.json` already includes the required SPA rewrite.

## Deployed addresses

| Network | Address | Explorer |
|---|---|---|
| StudioNet | `0x021DB40165dB2D51233118fCe0cBC1ae0Cdfe9Ae` | [View](https://explorer-studio.genlayer.com/address/0x021DB40165dB2D51233118fCe0cBC1ae0Cdfe9Ae) |
| Bradbury | `0x88c95f9a63d69C55f9089f9bCC9B3916e0568e59` | [View](https://explorer-bradbury.genlayer.com/address/0x88c95f9a63d69C55f9089f9bCC9B3916e0568e59) |

## Testing status

Deployed to both StudioNet and Bradbury. One full resolution has been run live end-to-end on StudioNet: `submit_attestation` against a real GitHub commit API endpoint (`api.github.com/repos/octocat/Hello-World/commits/master`), followed by `resolve_attestation`, reached consensus across 5 validators with zero rotation and empty stderr, and correctly extracted the commit's actual timestamp (`2012-03-06T23:06:50Z`) out of a large, deeply-nested response body — not a trivial fetch — landing on `verified` with the extracted value matching the live evidence exactly.

The `late` and `unverifiable` paths are implemented and pass the full seven-item nondet bug audit as literal greps against the real file, and the timestamp parser has been unit-tested standalone against Python's own `datetime` module as ground truth (including a leap-year cross-check and explicit malformed/impossible-date rejection tests, which caught and fixed one real bug before this was written). They have not yet been exercised against live GenVM — only `verified` has a real transaction behind it so far. Bradbury has been deployed to but not yet exercised at all. The frontend has passed a static audit loop — import resolution, a Rules-of-Hooks scripted check, JSX/`.ts` extension check, and a debug-artifact sweep — but has not been run against a real `tsc` typecheck (no package registry access in the build environment) or connected to the live contract yet. Treat the `verified` path as proven; treat `late`/`unverifiable` and the Bradbury deployment as implemented and carefully checked, not yet proven by running.

### Confirmed live transaction (StudioNet)

- **submit_attestation**: `task_description: "test verified case v2"`, `evidence_url: "https://api.github.com/repos/octocat/Hello-World/commits/master"`, `deadline_iso: "2012-03-07T00:00:00Z"` — finalized, `execution_result: SUCCESS`, `record_id: 1`.
- **resolve_attestation(1)**: finalized, `execution_result: SUCCESS`, empty stderr, `rotation_count: 0`, all 5 validators agreed. Equivalence Principle output: `{"found": true, "timestamp": "2012-03-06T23:06:50Z"}`. Final return: `{"record_id": 1, "status": "verified", "extracted_timestamp": "2012-03-06T23:06:50Z"}`.

Note the evidence URL points at a branch (`.../commits/master`), not a pinned commit SHA — deliberate, since a pinned SHA from this same repo 404'd during testing (the repo's commit history had moved past a previously-referenced SHA). A branch ref always resolves to whatever the current tip is, which also means this exact transaction is not perfectly reproducible against a future fetch if the branch has since moved — the timestamp above is what `master` pointed to at the time this transaction ran.

## Open questions

- ~~Whether `gl.nondet.web.get()` returns GitHub commit JSON in a form the extraction prompt can actually parse~~ — **resolved**: confirmed live, see the transaction detail above. The fetched body was large and deeply nested (author/committer sub-objects, `verification`, `parents`, `stats`, `files` with a diff patch) and the extraction still found the correct field.
- Confidence/rotation behavior on this contract's narrower extraction-only task has only been observed on one live case so far (zero rotation, unanimous agreement). Whether that holds on a genuinely ambiguous evidence body — one with two plausible-looking timestamp candidates, for instance — is still open. Prior contracts in this project (Copyleft, Recourse) saw meaningful leader rotation on ambiguous verdict judgments; whether Chronomark's narrower task is inherently less prone to that, as the design intends, needs more than one data point to confirm.
- The `late` and `unverifiable` paths have not been run live at all. `late` only requires changing the deadline on the same evidence source already confirmed working; `unverifiable` should use an `.invalid`-TLD URL specifically (IETF-reserved to never resolve), not an arbitrary "looks broken" domain — a dead commit SHA on a real domain was tried earlier in this build's testing and still returned real, parseable JSON (a GitHub 422 error body), which correctly drove `unverifiable` but wasn't the clean fetch-failure test originally intended.
