# Finish the live custody workflow

Use `/login` and the signed-in `/dashboard`, rather than `/demo`. Sign out between role accounts. The database currently has one declared batch and one draft; continue the declared batch instead of creating another.

## Collector

Open All batches and the DECLARED batch. Fill in Measured quantity (kg), Measurement basis, Actual event time (local), and Measurement source / discrepancy explanation. Enter moisture only if measured. Click Confirm pickup. The resulting status should be PICKED_UP.

## Processor

Open the same batch. Enter the actual received quantity, basis, event time, receipt number, facility and documented pathway. Explain the measurement source and any difference. Click Confirm intake. Upload the supporting receipt/evidence using the batch's evidence controls, then click Request audit review.

## Auditor

Review the uploaded source files, timeline, conflict findings and SoilSafe information. Document the resolution of findings and any relevant agronomic review. Record an approval, rejection or clarification with genuine reasoning. A completed workflow does not require approval: the appropriate decision depends on the evidence.

Use Verify event chain and the public verification link to check the final record. Public verification must exclude private source files and identities. A local hash-chain result is distinct from a confirmed blockchain anchor.

## What requires your input

- Actual pickup/intake measurements, event times and source documents.
- The responsible auditor's independent review and decision.
- Account sign-in credentials entered locally, never in chat.
- Hosting account access for deployment; optional Gemini credentials and a funded Sepolia signer if those features are wanted.

The coding assistant can inspect saved records, diagnose errors, fix code and prepare deployment. It cannot infer physical observations or truthfully attest to an independent review. Use the isolated demo for invented practice data.

After each stage, run `npm run check:supabase` or ask for a saved-record check. It performs read-only checks without exposing credentials.
