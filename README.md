<div align="center">

<img src="./public/favicon.svg" width="88" alt="Chronomark logo" />

# Chronomark

### On-chain deadline attestation — cite a fixed evidence source, get a verified / late / unverifiable answer

<br />

![Status](https://img.shields.io/badge/status-live-brightgreen?style=flat-square)
![Networks](https://img.shields.io/badge/networks-StudioNet%20%2B%20Bradbury-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20GenVM-3FB950?style=flat-square)

<br />

**Live App — frontend not yet deployed; contract is live, see [explorer](https://explorer-studio.genlayer.com/address/0x021DB40165dB2D51233118fCe0cBC1ae0Cdfe9Ae)** &nbsp;·&nbsp; **[Documentation](./docs/architecture.md)** &nbsp;·&nbsp; **[Smart Contract](./contracts/chronomark.py)**

</div>

<br />

---

## What this is

Chronomark checks whether a task was completed by a stated deadline. A submitter cites a fixed, independently-authoritative evidence URL — the reference framing is a GitHub commit API endpoint, since it returns a documented, fixed JSON shape with a plain-text commit date — and the contract fetches that evidence itself and returns a verified, late, or unverifiable answer.

<br />

<div align="center">

| | |
|---|---|
| **Concept** | Single-party deadline attestation |
| **Consensus need** | None by design — no counter-party benefits from a false verdict. This is a verification utility, not a dispute contract: multi-validator consensus exists here to guarantee independent re-derivation of the extracted timestamp, not to arbitrate between two adversarial parties. |
| **Evidence source** | Fetched directly by the contract via `gl.nondet.web.get()` — never the submitter's description of the evidence, only the evidence itself |
| **Networks** | StudioNet + Bradbury |

</div>

<br />

---

## How it works

1. Submit a task description, an evidence URL, and a deadline. Fully deterministic — no LLM involved at this step.
2. Resolve the attestation. The contract fetches the evidence URL and asks an LLM to extract a single ISO-8601 timestamp from the fetched text — nothing else. The LLM never sees the deadline and never renders an opinion on whether it was met.
3. Independent validators re-run the same extraction and must agree exactly on the extracted timestamp itself, not on a derived label.
4. Once validators agree, the contract compares the extracted timestamp against the stored deadline in plain deterministic code, and records `verified`, `late`, or `unverifiable`.

<br />

<details>
<summary><b>Why extraction and comparison are split apart</b></summary>
<br />

Every other nondet contract in this build history asks the LLM to render a subjective verdict with a confidence tolerance band, because judging contested evidence is inherently fuzzy. Chronomark's LLM step is narrower by design: it only extracts a timestamp. The verified/late/unverifiable decision happens afterward, in plain deterministic Python, by comparing that timestamp to the stored deadline. This means validator re-derivation can require an *exact* match on the extracted data point — there's no subjective judgment left to tolerate a band around.

</details>

<br />

---

## Deployed contracts

<div align="center">

| Network | Address | Explorer |
|---|---|---|
| StudioNet | `0x021DB40165dB2D51233118fCe0cBC1ae0Cdfe9Ae` | [View](https://explorer-studio.genlayer.com/address/0x021DB40165dB2D51233118fCe0cBC1ae0Cdfe9Ae) |
| Bradbury | `0x88c95f9a63d69C55f9089f9bCC9B3916e0568e59` | [View](https://explorer-bradbury.genlayer.com/address/0x88c95f9a63d69C55f9089f9bCC9B3916e0568e59) |

</div>

<br />

---

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Full deployment instructions: [`docs/deployment.md`](./docs/deployment.md)

<br />

---

## Project structure

```
contracts/chronomark.py           The GenVM contract
frontend/                         React + Vite app
docs/                             architecture.md, deployment.md, contracts.md, frontend.md
LICENSE                           MIT
```

<br />

---

## Status

<div align="center">

![Deployed](https://img.shields.io/badge/StudioNet-deployed-brightgreen?style=flat-square)
![Deployed](https://img.shields.io/badge/Bradbury-deployed-brightgreen?style=flat-square)
![Tested](https://img.shields.io/badge/verified%20path-live--confirmed-brightgreen?style=flat-square)
![Untested](https://img.shields.io/badge/late%20%2F%20unverifiable%20paths-not%20yet%20live--run-yellow?style=flat-square)

</div>

Deployed to both StudioNet and Bradbury. One full resolution has been run live end-to-end on StudioNet: `submit_attestation` against a real GitHub commit API endpoint (`api.github.com/repos/octocat/Hello-World/commits/master`), followed by `resolve_attestation`, reached consensus across 5 validators with zero rotation and empty stderr, and correctly extracted the commit's actual timestamp (`2012-03-06T23:06:50Z`) out of a large, deeply-nested response body — not a trivial fetch — landing on `verified` with the extracted value matching the live evidence exactly.

The `late` and `unverifiable` paths are implemented and pass the full seven-item nondet bug audit as literal greps against the real file, and the timestamp parser has been unit-tested standalone against Python's own `datetime` module as ground truth (including a leap-year cross-check and explicit malformed/impossible-date rejection tests, which caught and fixed one real bug before this was written). They have not yet been exercised against live GenVM — only `verified` has a real transaction behind it so far. Bradbury has been deployed to but not yet exercised at all. The frontend has passed a static audit loop — import resolution, a Rules-of-Hooks scripted check, JSX/`.ts` extension check, and a debug-artifact sweep — but has not been run against a real `tsc` typecheck (no package registry access in the build environment) or connected to the live contract yet. Treat the `verified` path as proven; treat `late`/`unverifiable` and the Bradbury deployment as implemented and carefully checked, not yet proven by running.

<br />

---

<div align="center">

Built on [GenLayer](https://genlayer.com) · [Portal submission](https://portal.genlayer.foundation/)

</div>
