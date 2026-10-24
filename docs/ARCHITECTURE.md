# Architecture

Private route handlers validate Supabase Auth with getUser, derive the actor from the protected profile, validate input with Zod, and evaluate current persisted state. The cookie-refresh proxy is not an authorization boundary.

The transaction-friendly batch JSON aggregate is accompanied by normalized profiles, plots, evidence assets, collection events, processor receipts, events, decisions, findings, disputes, extractions and anchors. This keeps demo and production domain logic identical.

commit_batch takes an advisory transaction lock, checks the expected version, compares the immutable event prefix and original declaration, appends exactly one event, updates relational projections, and records an idempotency key atomically. Uploads necessarily precede this transaction; normal failures trigger compensating deletion. Process termination can leave an orphaned private object for administrator cleanup.

Files pass signature/size validation and actual-byte SHA-256 hashing before private storage. AI receives source bytes only after uploader authorization. It has no application tools. Validated, editable suggestions are explicitly confirmed into a new event.

Canonical serialization sorts object keys recursively, preserves array order and rejects undefined/non-finite values. A domain-separated event object includes schema version, actor, payload, evidence references and previous hash. SHA-256 forms the chain; genesis is 64 zeroes.

Anchoring requires an approved nonsynthetic batch. Sepolia stores the root at the latest approval event and its prefix length. Later disputes remain visible even when an earlier root is authentic. Public verification checks both receipt and contract; unavailable networks are distinguished from confirmed matches.

The /demo layout holds isolated React context across navigation. Refresh resets it. Four deterministic scenarios use the same domain functions without accessing production data. Synthetic source text is served from a fixed ID allowlist and hashed from its actual UTF-8 bytes.

The initial implementation guards a 1,000-record limit to avoid silently missing conflicts. Larger deployments require indexed receipt/hash queries, pagination, organizational assignments, distributed signing and monitoring.
