# Bug-fix rollout — 25 October 2026

Implemented:
- Load the latest saved proof anchor in the workspace and refresh after an anchor request/check.
- Reserve AI attempts atomically before provider calls: 10 per actor per hour and 100 globally in a rolling 24-hour window. Provider failures consume reservations.
- Reject declared removal above total generated residue (same mass basis).
- Treat blank/null moisture as unknown; retain explicit zero.
- Distinguish incorrect credentials, unconfirmed email, suspension, throttling and provider outages using safe messages.

## Required database step
Open Supabase SQL Editor, create a new query, paste the contents of
supabase/migrations/003_atomic_ai_budget.sql and run it once.
Migrations 001 and 002 must already be applied; do not rerun them.
Then run npm run check:supabase locally. It now checks for reserve_ai_attempt.

Migration 003 is tested locally but has not been applied to the hosted database.
Until it is applied, configured AI extraction fails closed instead of bypassing its budget.
Manual evidence entry remains available. Existing records and passwords are unchanged.

## Verification
46 unit/database tests pass, including new validation, login-error mapping,
anchor hydration and database quota regression tests.
The anchor relation query was checked read-only against the hosted Supabase project.
No live AI calls or blockchain transactions were made.
