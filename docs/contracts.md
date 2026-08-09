# Smart Contract

`contracts/chronomark.py`. Single storage type, one `TreeMap`, two write methods, two view methods.

## Deployed addresses

| Network | Address |
|---|---|
| StudioNet | `0x021DB40165dB2D51233118fCe0cBC1ae0Cdfe9Ae` |
| Bradbury | `0x88c95f9a63d69C55f9089f9bCC9B3916e0568e59` |

Full deployment/testing detail: [`deployment.md`](./deployment.md).

## Lifecycle

1. Submit a task description, an evidence URL, and a deadline. Fully deterministic — no LLM involved at this step.
2. Resolve the attestation. The contract fetches the evidence URL and asks an LLM to extract a single ISO-8601 timestamp from the fetched text — nothing else. The LLM never sees the deadline and never renders an opinion on whether it was met.
3. Independent validators re-run the same extraction and must agree exactly on the extracted timestamp itself, not on a derived label.
4. Once validators agree, the contract compares the extracted timestamp against the stored deadline in plain deterministic code, and records `verified`, `late`, or `unverifiable`.

## Method reference

### `submit_attestation(task_description: str, evidence_url: str, deadline_iso: str) → str`

Write, fully deterministic. Sanitizes and validates all three inputs; `deadline_iso` must parse under the contract's own ISO-8601 subset or the transaction reverts (`assert`, not a silent failure). Returns `{"record_id": int, "status": "submitted"}`.

### `resolve_attestation(record_id: u256) → str`

Write, nondet. Runs the leader/validator extraction described above, then the deterministic deadline comparison. Returns `{"record_id": int, "status": str, "extracted_timestamp": str}`. Fails with `assert` if the record doesn't exist or isn't in `submitted` state (idempotency guard — a record can only be resolved once).

### `get_attestation(record_id: u256) → str`

View. Returns the full record: `record_id`, `submitter`, `task_description`, `evidence_url`, `deadline_iso`, `status`, `extracted_timestamp`, `resolved_epoch_seconds_diff`.

### `get_next_id() → str`

View. Returns `{"next_id": int}` — the ID that will be assigned to the next submission.

## Verdict shape

Single-outcome, not the multi-way verdict pattern used elsewhere in this project's contract history. `status` is one of `submitted` (pending), `verified`, `late`, or `unverifiable` — set once, at resolution, never revisited. There's no appeal or re-resolution path by design: this is a verification utility, not a dispute contract, so there's no second party who could contest the outcome.

## Why extraction and comparison are split apart

Every other nondet contract in this project's history asks the LLM to render a subjective verdict with a confidence tolerance band, because judging contested evidence is inherently fuzzy — reasonable models can disagree on how confident to be about an ambiguous reading. Chronomark's `leader_fn` does something narrower: it extracts one ISO-8601 timestamp and nothing else. It is never told the deadline and never renders a verified/late/unverifiable opinion; that decision happens afterward, in plain deterministic Python, comparing the extracted timestamp against the stored deadline.

This changes what independent re-derivation means. `validator_fn` doesn't tolerate a confidence band around a subjective judgment — there's no judgment to be tolerant of. It re-extracts the timestamp independently and requires an exact match on the extracted string, then independently re-parses both strings through the same deterministic epoch-second converter to confirm they agree on the underlying instant, not just on byte-identical text. Two validators agreeing on a final "late" label while having actually extracted different timestamps would be exactly the kind of shallow-agreement failure this design avoids.

## Deliberate scope boundaries

- The timestamp parser only handles a constrained ISO-8601 subset (see the parser's own docstring in `contracts/chronomark.py` for the exact grammar). A source returning a non-ISO format correctly falls through to `unverifiable` rather than being parsed by a broader natural-language date parser — a fixed, narrow, auditable parser is what makes exact-match re-derivation meaningful; a fuzzier parser would reintroduce model-dependent variance.
- No timezone-database-aware comparison — numeric offsets (`+05:30`, `Z`) are handled directly; a named zone abbreviation would not be.
- The deadline is submitter-provided at submission time, not itself fetched from anywhere independent. This is intentional: the deadline is the submitter's own commitment being checked, not contested evidence — only the completion timestamp is fetched from an independent source.
- No staking, no settlement, no counter-party. Adding any of these would be importing Projects-track dispute-contract shape into a submission that's deliberately a narrow verification utility.
