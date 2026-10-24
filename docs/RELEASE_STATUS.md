# Local release status

BioProof runs locally with Supabase configured in the developer's ignored `.env.local`. The synthetic demo also runs without credentials. Deployment, Gemini and Sepolia remain unconfigured.

## Validation

- ESLint: passed with no warnings.
- TypeScript and generated Next.js route types: passed.
- Unit and PostgreSQL migration/transaction tests: 23 passed.
- Solidity registry: local EVM deployment and five authorization, anchoring and version checks passed.
- Next.js production build: passed.
- Desktop/mobile browser tests against the production build: 14 passed, covering landing, conflicts, public redaction, tamper detection, custody review, demo state and unconfigured API behavior.

PostgreSQL tests run through PGlite with Auth/Storage schema fixtures. They do not validate hosted Supabase authentication or object storage. Contract tests use a local EVM, not Sepolia.

## Service setup still required

Both SQL migrations and four independent role accounts are now configured in the user's Supabase project. Read-only integration checks pass for all 14 tables, anonymous-access denial, both RPCs, the private evidence bucket and two persisted batch hash chains. One batch is declared and one remains a draft. No pickup, intake or evidence upload has yet been recorded. This verifies configuration and stored integrity, not the complete hosted workflow.

The follow-up run passed all 23 unit/SQL tests, 14 desktop/mobile browser tests against the running local server, and ESLint. Browser custody tests use the synthetic demo. Run `npm run check:supabase` to repeat the live read-only checks.

Gemini extraction and Sepolia anchoring need their own credentials. Vercel configuration and CI are included; no hosted application deployment or funded transaction has been performed.

Before using real evidence, exercise the complete hosted custody/upload/review flow with separate accounts, inspect public redaction, and test configured extraction and anchoring. The demo data and source documents are explicitly synthetic.

## Known limits

The workspace fails closed above 1,000 records. Image matching uses identical bytes, not perceptual similarity. Signing at higher volume needs a serialized worker and recovery operations. No field pilot, certified climate benefit, carbon credit or professional security audit is claimed.

The production dependency audit reported zero vulnerabilities. The full dependency audit reported three high-severity development-only entries in the Hardhat dependency chain, associated with its nested Zod collection-size denial-of-service issue. These tools are not part of the deployed application runtime. Recheck upstream fixes before upgrading; forcing an incompatible Zod major version is not a verified fix.
