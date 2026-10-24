# Optional feature workflow verification

Checked 25 October 2026.

## Automated app workflow

Run npm run test:batch.

The complete-batch integration test now exercises:
- Evidence extraction by its uploader; another user's extraction request is denied.
- Actual quota reservation SQL and extraction-row persistence.
- Cached extraction reuse without another provider call or quota reservation.
- Comparison of suggested receipt and weight with the fixture's intake.
- Human-confirmation PATCH appends EXTRACTION_CONFIRMED without changing custody measurements.
- Anchoring denied for operational roles and records not yet approved.
- Auditor submission creates one pending anchor and persists its transaction hash.
- Rechecking while pending does not broadcast a second transaction.
- A mined successful transaction and matching contract proof persist CONFIRMED.
- Public proof JSON and the actual verification page show Confirmed anchor and the explorer link.
- A mismatching contract proof produces FAILED and the page shows No confirmed anchor.
- Private evidence paths remain absent from public output.

Actual Next handlers, schema validation, all three migrations and commit_batch run.
Identities, storage, Gemini responses and Ethereum RPC/contract responses are test doubles.
No new real records, AI calls, Sepolia transactions or independent audit decisions were made in this test run.

Full suite: 93 tests pass. Lint and TypeScript pass.

## Live services previously verified

- Gemini extracted the correct receipt number and 1000 kg weight from an explicitly synthetic PDF.
- Sepolia registry deployment is confirmed and its authority matches the configured signer.
- npm run check:optional currently passes for both services.

## Hosted workflow prerequisites still missing

Read-only inspection found:
- BP-fc9de3ef-abba-42dc-896d-24e2eb81c225: DRAFT, no evidence.
- BP-2bec2982-43b1-4a91-bc18-6576093a32c2: REJECTED, no evidence.
- No evidence_assets rows and no proof_anchors rows.

Therefore neither an uploaded-document app workflow nor anchoring an approved real batch can be
completed against this database yet. Do not approve a rejected record simply to satisfy a test.

## Next actions in the signed-in app

1. Complete genuine custody observations using the separate farmer, collector and processor accounts.
2. As collector or processor, attach the appropriate source document using the batch evidence controls.
3. Open that document as its uploader, request extraction, inspect all fields against the original
   and confirm only the fields you have reviewed.
4. Request review and have the auditor independently decide the batch after reviewing evidence/findings.
5. If APPROVED, the auditor can Request / check anchor, then check again after mining.
6. Open /verify/<batch-id> to inspect Confirmed anchor and the matching approved event prefix.

The coding assistant can inspect the saved result and diagnose errors once these records exist.
Physical observations and an independent audit conclusion must come from the responsible users.
