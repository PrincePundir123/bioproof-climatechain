# Regression tests

Run all unit, API-handler and local database regressions:

    npm test

The existing GitHub Actions quality gate runs this command on pushes and pull requests.

| Fix | Coverage |
| --- | --- |
| Workspace anchor status | tests/anchor-status.test.ts: saved CONFIRMED, PENDING and FAILED states; latest-version query; missing anchors; database errors; no mutation of saved documents |
| AI quota enforcement | tests/ai-quota-route.test.ts: denied/unavailable quotas block provider calls; reservation happens before provider work; cached results cost no quota; failed calls are not refunded |
| Atomic AI budget | tests/database.test.ts: migration 003; only one request gets the last daily slot; hourly limit; expired reservations; browser-role execution denied |
| Removal above total residue | tests/validation-auth.test.ts and tests/auth-workspace-routes.test.ts: reject invalid input before writes; permit equality and omitted totals |
| Unknown moisture | tests/validation-auth.test.ts and tests/auth-workspace-routes.test.ts: blank/null values remain unknown; measured zero survives persistence |
| Useful sign-in errors | tests/validation-auth.test.ts and tests/auth-workspace-routes.test.ts: HTTP status and safe message for bad credentials, unconfirmed email, suspension, throttling and outages |
| Earlier local-login regression | tests/request-origin.test.ts and tests/auth-workspace-routes.test.ts: normalized Next URL versus browser Host; cross-origin rejection; existing six-character password accepted |

Tests call real route handlers and validation code with mocked service boundaries.
Database regressions apply the actual SQL migrations to an isolated PGlite database.
They do not use real accounts, AI calls, blockchain transactions or hosted database writes.

Current verified result: 75 tests across 9 files pass; lint and TypeScript pass.
Browser tests remain a separate command: npm run test:e2e.
