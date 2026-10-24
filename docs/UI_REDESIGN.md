# BioProof visual redesign

Scope: presentation only. Reference: https://www.koltiva.com/koltitrace. Original agricultural photography, forest/sage palette and spacious public storytelling; operational screens remain focused on evidence. No database, domain, API, authentication, proof or blockchain changes.

## Screen inventory

| Surface | Preserved behavior |
| --- | --- |
| `/` | Demo, sign-in, methodology and public example links |
| `/login` | Existing email/password handler and redirect |
| `/demo` and `/dashboard` | Existing catch-all resolver, list/search/filter, role-dependent content |
| `/review`, `/conflicts`, `/lab`, `/analytics` within each workspace | Existing queues, graph/list, isolated tamper copy and measurements |
| `/batches/new`, `/batches/[id]` within each workspace | Plot/draft creation, declaration, custody, evidence, decisions, dispute, exports and anchor |
| `/dashboard/evidence/[id]` | Signed originals, editable extraction JSON and confirmation |
| `/verify/[id]` | Existing public serializer, integrity and chain results, QR |
| `/about`, `/methodology` | Factual scope and verification limitations |
| Loading/error/not-found | Clear recovery and accessible feedback |

Baseline: clean working tree; 23 unit/SQL tests passed. Before screenshots use synthetic demo data only. Public photography must never stand in for batch evidence. All live write-based acceptance actions remain with the user; automated workflow tests use the demo.
