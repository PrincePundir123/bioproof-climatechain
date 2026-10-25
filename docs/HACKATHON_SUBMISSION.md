# StubbleTrail submission packet

Prepared for IEEE ClimateChain Global Hackathon, 25 October 2026.
Status: prepared, not submitted.

## Devpost fields

**Project name:** StubbleTrail

**Tagline:** From field residue to trusted evidence.

**Track:** Sustainable Supply Chains

**Live application:** https://stubbletrail.vercel.app/

**No-login demo:** https://stubbletrail.vercel.app/demo

**Public sample proof:** https://stubbletrail.vercel.app/verify/BP-001

**Public source repository:** https://github.com/PrincePundir123/bioproof-climatechain

**Sepolia registry:** https://sepolia.etherscan.io/address/0x299a81458a942CbAc39A24C95c7175CE758d9E26

**Team:** Solo. Enter your full name and Devpost profile in the submission form.

**Demo video:** Upload docs/submission/stubbletrail-demo.webm and paste the public or unlisted video URL.

Brand note: StubbleTrail is the submission name and deployed domain. The current interface
and source repository retain the earlier BioProof name.

## Inspiration

Agricultural residue passes through several hands before it reaches a processing facility.
A farmer's declaration, a collector's measurement and a processor's receipt can describe
the same material differently. When those records are disconnected, a reviewer struggles
to explain discrepancies or identify a receipt reused across multiple claims.

I built StubbleTrail to make that evidence trail easier to inspect. The project focuses on
accountability in sustainable supply chains: who recorded a measurement, which original
document supports it, what needs investigation, and how the reviewer reached a decision.

## What it does

StubbleTrail connects four roles: farmer, collector, processor and auditor. Farmers register
plots and declare residue batches. Collectors and processors record independent handovers
and attach private supporting documents.

The application flags inconsistent quantities, missing documents, unexpected chronology,
overlapping collections, repeated receipt identifiers and identical file bytes. Each signal
calls for investigation rather than an automatic accusation.

Gemini suggests structured fields from uploaded documents. The uploader checks those fields
against the original and explicitly confirms them. AI does not approve a batch or silently
replace recorded measurements.

Auditors document findings, clarification and decisions. A SHA-256 event chain links the
history. An approved record can be anchored to the deployed Sepolia registry, while public
verification exposes a redacted proof without revealing private source files or identities.
SoilSafe keeps proposed removal proportions and site-specific agronomic context visible.

## How I built it

The application uses Next.js, React and TypeScript, with Supabase for authentication,
PostgreSQL and private file storage. Zod validates inputs and extraction results. Transactional
SQL appends events and relational projections with optimistic concurrency and idempotency checks.
The Solidity registry uses an authorized signer and increasing proof versions; ethers connects
the server to Sepolia. The application is deployed on Vercel.

## Challenges

The central challenge was keeping declarations, custody measurements, documents, AI suggestions
and audit decisions distinct. I also had to handle concurrent updates, private evidence access,
wet-versus-dry measurements and the difference between a valid local hash chain and a confirmed
on-chain commitment. Deployment testing exposed an npm-version lockfile mismatch, which was
reproduced and repaired using a clean Linux install.

## Accomplishments

The public application and no-login demo are deployed. The project has 93 passing automated
unit/API/database tests, desktop/mobile workflow tests and local contract checks. A clean Linux
production build passed. Gemini successfully extracted the receipt number and quantity from a
synthetic PDF. The Sepolia registry deployment and its signing authority were verified.

The full hosted workflow on genuine records is still under acceptance testing. The recorded
demo uses explicitly synthetic examples. I do not claim a completed field pilot, certified
environmental savings, issued carbon credits or a confirmed anchor for the synthetic sample.

## What I learned

Reliable verification depends on permissions, independent observations, understandable uncertainty
and recoverable transactions as much as cryptographic hashes. A blockchain commitment can help
detect changed records, but cannot establish whether a physical delivery or sustainability claim
is true. AI output also needs source inspection and accountable human confirmation.

## What is next

The next steps are hosted acceptance testing, a documented field pilot, organization-scoped
access, direct signed uploads, indexed conflict lookups, file scanning and managed signing.
Any future environmental impact estimates would need a separate, justified methodology.

## Built with

Next.js, React, TypeScript, Supabase, PostgreSQL, Gemini API, Solidity, ethers,
Ethereum Sepolia, Vercel, Zod, Vitest, Playwright, Hardhat, PGlite.

## Final submission checklist

- Join the hackathon using your own Devpost account.
- Confirm your name, solo participation and eligibility against the official form/rules.
- Paste the project fields and story above.
- Upload the captioned demo and add its accessible 3?5 minute video link.
- Add the project screenshots from docs/submission.
- Verify the repository and demo links work in an incognito window.
- Review the final preview and click Submit project / the final submission action.
- Confirm Devpost shows the project as submitted to this hackathon, not merely saved as a draft.

Deadline rechecked 25 October 2026: 26 October 2026, 00:00 UTC+03 = 26 October 2026, 02:30 IST.
Official overview: https://ieee-climatechain-hack.devpost.com/
Official rules: https://ieee-climatechain-hack.devpost.com/rules
The overview and rules give different eligibility summaries; use the actual registration
requirements and ask the organizer if your eligibility is unclear.
