# BioProof visual redesign

Scope: presentation only. Reference: https://www.koltiva.com/koltitrace. Original agricultural photography, forest/sage palette and spacious public storytelling; operational screens remain focused on evidence. No database, domain, API, authentication, proof or blockchain changes.

## Screen inventory

| Surface                                                             | Preserved behavior                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/`                                                                 | Demo, sign-in, methodology and public example links                                         |
| `/login`                                                            | Existing email/password handler and redirect                                                |
| `/demo` and `/dashboard`                                            | Existing catch-all resolver, list/search/filter, role-dependent content                     |
| `/review`, `/conflicts`, `/lab`, `/analytics` within each workspace | Existing queues, graph/list, isolated tamper copy and measurements                          |
| `/batches/new`, `/batches/[id]` within each workspace               | Plot/draft creation, declaration, custody, evidence, decisions, dispute, exports and anchor |
| `/dashboard/evidence/[id]`                                          | Signed originals, editable extraction JSON and confirmation                                 |
| `/verify/[id]`                                                      | Existing public serializer, integrity and chain results, QR                                 |
| `/about`, `/methodology`                                            | Factual scope and verification limitations                                                  |
| Loading/error/not-found                                             | Clear recovery and accessible feedback                                                      |

Baseline: clean working tree; 23 unit/SQL tests passed. Before screenshots use synthetic demo data only. Public photography must never stand in for batch evidence. All live write-based acceptance actions remain with the user; automated workflow tests use the demo.

## Delivered

- Responsive public navigation, original brand treatment, photographic homepage, About and photo credits, methodology and split-layout login.
- Forest/sage design tokens, semantic status badges, keyboard focus, readable forms, mobile navigation, loading/error/not-found states and reduced-motion support.
- Dark workspace sidebar, responsive batch table, explicit no-match state, role-aware forms, custody measurements with individual bases/moisture, source panels, review actions and proof history.
- Restyled evidence inspection, conflict graph/list, tamper lab, activity and public verification. Original action handlers, validation, permission rules and payloads are retained.
- Five locally hosted real photographs with source/license records. The product screenshot is an actual synthetic-demo capture; no private records are used.

## Verification

- TypeScript, ESLint and production build pass.
- 23 unit/SQL regression tests pass.
- Local EVM contract checks pass: authorization, anchoring, mismatch, replay protection and version update.
- 28 browser tests pass, including the existing custody-to-audit workflow, public redaction, demo state, mobile navigation, photo loading, form labels and horizontal-overflow checks at 360, 390, 768, 1024 and 1440 px.
- Read-only Supabase check passes: all 14 tables, anonymous denial, both RPCs, private evidence bucket and two stored batch hash chains/projections.
- Compared the final diff against the pre-redesign revision: no changes to `src/lib`, `src/app/api`, `supabase` or `contracts`.

Browser tests use a fresh production server on port 3100 (`PLAYWRIGHT_PORT`) to avoid reusing a stale development server. Desktop/mobile production captures are under `docs/screenshots/redesign-*-1440.png` and `redesign-*-390.png`.

## Limits and live acceptance

No hosted deployment was performed. No live database records were changed. Authenticated uploads, AI extraction and live Sepolia transactions were not repeated because that would require real account sessions, documents or external credentials; their existing handlers are unchanged. Demo tests exercise upload hashing, independent custody and approval. Operational acceptance should still be checked with authorized accounts after deployment. An agricultural marketing photo is never evidence for a batch.

Visual fixes include empty search feedback, linked form labels and individual measurement basis display; no domain calculation changes were introduced.
