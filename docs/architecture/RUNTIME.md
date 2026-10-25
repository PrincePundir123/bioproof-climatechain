# StubbleTrail runtime architecture

Open [the interactive diagram and supporting cards](runtime.html). The [Mermaid source](runtime.mmd) is also editable and can be rendered in GitHub-compatible Markdown tooling.

This view contains **11 core components**, one highlighted write path and five trust boundaries. It describes the current code rather than a proposed deployment. The Next.js modules are logical components within one application, not separately deployed microservices. Vercel is the configured host; Supabase, Gemini and Sepolia are external runtime dependencies.

Archify was requested but was not available among the session's tools, local commands or discoverable plugins. These local artifacts were prepared from the repository; they were not created or published through Archify.

## Primary path

**Browser action → request authorization → custody/conflict/hash rules → PostgreSQL transactional commit.**

For a representative pickup or intake, the browser posts to `/api/batches/[id]` with an idempotency key. The handler checks the request origin, validates the session through Supabase Auth, reads the protected role and checks access. Domain functions validate the action, recalculate findings and append the linked event. `saveBatch()` calls `commit_batch` with the expected version. The response returns after persistence. Response arrows, database reads and other internal calls are described in the cards rather than drawn as additional edges.

## Supporting cards

### 1. Browser application

Authenticated farmers, collectors, processors and auditors use the shared React workspace. Public visitors inspect a separate redacted view. The browser and uploaded documents are untrusted input. No service-role key, Gemini key or signing private key belongs in the client. The demo uses isolated React memory and the shared rules; it does not write production records.

Sources: [workspace](../../src/components/workspace.tsx), [demo provider](../../src/components/demo-provider.tsx).

### 2. Request and authorization layer

Next.js route handlers and private server pages validate the user with `auth.getUser()`, derive the role from a protected profile and apply record access checks. Mutating endpoints check origin and validate their inputs. The dashboard proxy refreshes cookies; it is not the authorization boundary. Initial server rendering also reads data through the server helpers.

Sources: [server helpers](../../src/lib/server.ts), [batch handler](../../src/app/api/batches/[id]/route.ts), [origin check](../../src/lib/request-origin.ts), [proxy](../../src/proxy.ts).

### 3. Supabase Auth

The server validates cookie-backed sessions using Supabase SSR. Authorization additionally depends on the profile stored in PostgreSQL; the authenticated identity alone does not supply a trusted role. Auth and PostgreSQL interactions are both part of resolving an actor, even though only one session-validation edge is drawn.

Source: [actor and Auth client](../../src/lib/server.ts).

### 4. Custody, conflict and hash rules

Shared TypeScript modules evaluate transitions, separation of roles, receipt/file conflicts, measurements and SoilSafe context. Events include canonical content and the previous event hash. A matching chain detects changes relative to an expected history; it does not establish that the physical observations were true. The same modules support the isolated demo.

Sources: [domain](../../src/lib/domain.ts), [workflow](../../src/lib/workflow.ts), [proof](../../src/lib/proof.ts).

### 5. PostgreSQL and transactional commit

Supabase PostgreSQL stores the batch document and normalized profiles, plots, evidence metadata, events, findings, decisions, extraction results and anchor reservations. `commit_batch` serializes custody writes with an advisory lock, checks the expected version and immutable prefix, appends an event and updates projections atomically. Private tables and RPCs deny direct browser roles; the server uses a service-role credential, so its authorization checks are essential. The workspace currently rejects datasets above 1,000 records.

Sources: [core migration](../../supabase/migrations/001_evidence.sql), [server persistence](../../src/lib/server.ts).

### 6. Private evidence storage

The server validates file signatures and size, hashes actual bytes and uploads to a private Supabase bucket. Authorized readers receive 60-second signed links; possession of such a link temporarily grants access to its object. Uploads, metadata insertion and the batch commit are not one transaction. The handler compensates for ordinary failures, but process termination can leave an orphaned object. The AI module reads source bytes from the same private bucket; that extra edge is intentionally omitted.

Sources: [evidence handler](../../src/app/api/evidence/[id]/route.ts), [file validation](../../src/lib/files.ts).

### 7. Evidence extraction module

The uploader must be authenticated, able to read the batch and own the evidence asset. Existing extraction results are reused. New attempts reserve budget in PostgreSQL before source bytes are downloaded and sent to Gemini. Limits are ten per actor per hour and 100 shared attempts in a rolling 24-hour window; failed provider calls consume budget. Suggestions are saved separately. Explicit confirmation appends an event via the normal commit path and does not replace custody measurements or approve a claim. Database/storage edges are summarized here to keep the canvas sparse.

Sources: [AI handler](../../src/app/api/ai/[id]/route.ts), [atomic quota migration](../../supabase/migrations/003_atomic_ai_budget.sql).

### 8. Google Gemini

An optional external provider receives the authorized document bytes and extraction instructions. Its output is untrusted: the server parses JSON through a strict Zod schema, and the user reviews suggestions. The call has a 30-second timeout and grants no application tools. Manual structured confirmation remains available without Gemini.

Source: [Gemini client and schema](../../src/lib/ai.ts).

### 9. Anchor orchestration module

Auditors or administrators can request a commitment for an approved nonsynthetic batch with a valid chain. The server selects the latest approved event prefix, reserves the root in PostgreSQL and broadcasts using a server-held signer. The transaction hash and status are persisted. An uncertain broadcast is not blindly retried: the reservation requires reconciliation. Signer, reservation and persistence details belong in this card rather than three more nodes.

Sources: [anchor handler](../../src/app/api/anchor/[id]/route.ts), [blockchain client](../../src/lib/blockchain.ts).

### 10. Sepolia RPC and Solidity registry

The configured public RPC connects the server to Ethereum Sepolia. The server checks the chain, deployed contract and signing authority. The registry stores a batch-key/root/version commitment, not private evidence. A successful receipt and matching registry proof are both required for confirmation. A network problem is not evidence of success. Anchoring is optional and provides record integrity, not proof of delivery.

Sources: [blockchain client](../../src/lib/blockchain.ts), [public proof checks](../../src/lib/public-proof.ts).

### 11. Public proof service

Both the public page and public JSON endpoint use `getPublicProof()`. Synthetic examples come from deterministic fixtures; real records require a recorded decision. The service verifies the local chain, reads anchor metadata and checks the receipt plus registry proof when configured. `publicRecord()` removes private identities, file paths, original files and private payloads. Public event hashes alone are insufficient for full recomputation; that needs an authorized private export. The browser receives the redacted projection, never database credentials.

Sources: [public proof service](../../src/lib/public-proof.ts), [public projection](../../src/lib/workflow.ts), [public page](../../src/app/verify/[id]/page.tsx).

## Trust boundaries

| Boundary                        | Data crossing it                                             | Enforcement and limits                                                                                                |
| ------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Browser → application           | Cookies, action JSON and uploaded file bytes                 | Server identity/role/access checks, origin checks on mutations, schemas and file validation                           |
| Application → Supabase          | Validated records, private files, Auth checks                | Server credentials, private tables/bucket and transaction RPCs; service-role access makes application checks critical |
| Application → Gemini            | Authorized source bytes; untrusted structured output returns | Uploader-only requests, atomic quota, timeout, schema validation and explicit human confirmation                      |
| Application → Sepolia           | Public batch-key/root/version commitments and RPC responses  | Network/contract/authority checks, reservation before broadcast and receipt-plus-proof verification                   |
| Private records → public output | Redacted custody and hash/status projection                  | Dedicated public serializer; no private identities, original source files or private event payloads                   |

## What is intentionally omitted from the edge map

The cards explain return responses, initial server-rendered reads, quota calls, evidence downloads, extraction persistence, anchor reservations and status updates. There is no message broker, separate worker service, autonomous AI agent, direct browser-to-database write path or automatic claim approval in the current implementation. Adding those would describe a different architecture.
