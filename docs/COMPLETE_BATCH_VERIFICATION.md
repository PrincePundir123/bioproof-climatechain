# Complete batch verification

Verified 25 October 2026.

## Run it again

- npm run test:batch — complete API, SQL persistence, evidence and public-rendering journey.
- npm run test:batch:browser — desktop/mobile journey through the demo UI.
- npm test — all unit and integration tests.

Browser tests require a production build. To use a fresh server on Windows:

    npm run build
    $env:PLAYWRIGHT_PORT='3100'
    npm run test:batch:browser

## Verified boundaries

| Boundary | Evidence |
| --- | --- |
| Farmer creates plot and draft | Actual workspace POST handler inserts plot and commits CREATE through migration 001 |
| Farmer declares | DECLARED persists; processor cannot declare |
| Collector picks up | PICKED_UP persists; repeating the same idempotency key adds no event |
| Collector uploads evidence | Multipart upload validates bytes, hashes them, stores private metadata and appends EVIDENCE_ADDED |
| Processor records intake | RECEIVED persists with an independent actor, matching dry mass and later timestamp |
| Processor uploads evidence | Two distinct file hashes and metadata rows exist |
| Auditor reviews | Review requested; SoilSafe reasoning and independent APPROVE are persisted; farmer approval is denied |
| Private files remain private | Auditor receives a 60-second signed URL; unrelated farmer is denied access |
| Public result | Before decision: 404. After approval: APPROVED, matching root and valid chain, no private identities, filenames, paths, receipt number or detailed decision reason |
| Public page | Actual verification page renders APPROVED, Local chain matches and No confirmed anchor |
| Browser | Desktop and mobile create a new demo draft, declare it, perform both handovers and uploads, document review, approve and verify the chain |

## Test environment and limits

tests/complete-batch.test.ts calls the actual Next route handlers and verification page.
The actual three SQL migrations and commit_batch function run in isolated PGlite.
Authentication identities and private object storage are test doubles.
The browser test uses the existing isolated demo session, with the application's four demo roles.
The browser and integration checks are complementary; they are not a hosted Supabase login test.

All measurements, files and review reasons are explicitly test data. No real custody observations
or approvals were added to hosted Supabase. No AI calls or blockchain transactions were made.
A real account workflow still requires sign-in and genuine source observations/documents.

## Results

- Complete integration journey: passed.
- New-batch browser journey: 2 passed (desktop and mobile).
- Full unit/integration suite: 76 passed across 10 files.
- Lint and TypeScript: passed.
