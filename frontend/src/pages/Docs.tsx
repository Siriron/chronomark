import { CONTRACT_ADDRESSES } from '../config/chains';

const SECTIONS = [
  {
    id: 'overview',
    title: 'Overview',
    body: (
      <>
        <p>
          Chronomark checks whether a task was completed by a stated deadline, using a fixed,
          independently-authoritative evidence source — currently framed around GitHub commit API
          endpoints, since those return a documented, fixed JSON shape with a plain-text commit date.
        </p>
        <p>
          There's no counter-party and no dispute. A submitter states a claim and cites where to check
          it; the contract does the checking. It's a verification tool, not a judgment platform.
        </p>
      </>
    ),
  },
  {
    id: 'how-it-works',
    title: 'How it works',
    body: (
      <ol className="list-decimal space-y-2 pl-5">
        <li>Submit a task description, an evidence URL, and a deadline. This step is fully deterministic — no LLM involved.</li>
        <li>
          Resolve the attestation. The contract fetches the evidence URL and asks an LLM to extract a
          single ISO-8601 timestamp from the fetched text — nothing else. The LLM never sees the
          deadline and never renders an opinion on whether it was met.
        </li>
        <li>
          Independent validators re-run the same extraction and must agree exactly on the extracted
          timestamp — not on a derived label, on the actual data point.
        </li>
        <li>
          Once validators agree, the contract compares the extracted timestamp against the stored
          deadline itself, in plain deterministic code, and records verified, late, or unverifiable.
        </li>
      </ol>
    ),
  },
  {
    id: 'architecture',
    title: 'Architecture',
    body: (
      <p>
        React + Vite frontend, talking to a single GenVM contract via <code>genlayer-js</code>. No
        backend, no database — all state lives on-chain in the contract's <code>TreeMap</code> of
        attestations. Reads use an unauthenticated client; writes require a connected wallet and switch
        the wallet to the selected network before sending.
      </p>
    ),
  },
  {
    id: 'smart-contract',
    title: 'Smart contract',
    body: (
      <>
        <p>
          <code>contracts/chronomark.py</code>. Two write methods (<code>submit_attestation</code>,{' '}
          <code>resolve_attestation</code>) and two view methods (<code>get_attestation</code>,{' '}
          <code>get_next_id</code>).
        </p>
        <table className="mt-3 w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-border text-left text-textMuted">
              <th className="py-1.5 pr-4">network</th>
              <th className="py-1.5">address</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-borderSubtle">
              <td className="py-1.5 pr-4">StudioNet</td>
              <td className="py-1.5">{CONTRACT_ADDRESSES.studionet || 'not yet deployed'}</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">Bradbury</td>
              <td className="py-1.5">{CONTRACT_ADDRESSES.bradbury || 'not yet deployed'}</td>
            </tr>
          </tbody>
        </table>
      </>
    ),
  },
  {
    id: 'api-reference',
    title: 'API reference',
    body: (
      <dl className="space-y-3 font-mono text-xs">
        <div>
          <dt className="text-textPrimary">
            submit_attestation(task_description: str, evidence_url: str, deadline_iso: str) → str
          </dt>
          <dd className="mt-0.5 text-textMuted">
            Records a new attestation. deadline_iso must be a supported ISO-8601 timestamp or the
            transaction reverts. Returns {'{"record_id": int, "status": "submitted"}'}.
          </dd>
        </div>
        <div>
          <dt className="text-textPrimary">resolve_attestation(record_id: u256) → str</dt>
          <dd className="mt-0.5 text-textMuted">
            Fetches the evidence URL, extracts a timestamp via validator-consensus LLM extraction,
            compares it to the deadline, and finalizes the record's status.
          </dd>
        </div>
        <div>
          <dt className="text-textPrimary">get_attestation(record_id: u256) → str</dt>
          <dd className="mt-0.5 text-textMuted">Returns the full attestation record as JSON.</dd>
        </div>
        <div>
          <dt className="text-textPrimary">get_next_id() → str</dt>
          <dd className="mt-0.5 text-textMuted">Returns the next record ID that will be assigned.</dd>
        </div>
      </dl>
    ),
  },
  {
    id: 'faq',
    title: 'FAQ',
    body: (
      <div className="space-y-3">
        <div>
          <p className="text-textPrimary">Why GitHub specifically?</p>
          <p className="text-textMuted">
            It isn&rsquo;t hardcoded to GitHub — any URL returning fetchable text works. GitHub&rsquo;s
            commit API is the framing because its response shape is fixed and documented, so the
            extraction has something reliable to work against.
          </p>
        </div>
        <div>
          <p className="text-textPrimary">What if the evidence page has no clear timestamp?</p>
          <p className="text-textMuted">
            The attestation resolves to unverifiable. That&rsquo;s an honest outcome, not an error — the
            contract deliberately fails closed rather than guessing.
          </p>
        </div>
        <div>
          <p className="text-textPrimary">Is there any staking or payment involved?</p>
          <p className="text-textMuted">No. This is a verification utility, not a settlement contract.</p>
        </div>
      </div>
    ),
  },
];

export function Docs() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <a href="/" className="font-mono text-xs text-textMuted hover:text-verified">
        ← Chronomark
      </a>
      <h1 className="mt-6 font-mono text-2xl font-semibold text-textPrimary">Documentation</h1>

      <div className="mt-10 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 className="mb-3 font-mono text-sm font-semibold uppercase tracking-wide text-verified">
              {section.title}
            </h2>
            <div className="space-y-3 font-sans text-sm leading-relaxed text-textPrimary">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
