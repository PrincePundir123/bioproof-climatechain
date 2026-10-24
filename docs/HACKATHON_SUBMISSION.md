# Devpost submission draft

## Title

BioProof — AI-Powered Climate Evidence Verification for Agricultural Residue Supply Chains

## Short description

BioProof connects farmers, collectors, processors and auditors through inspectable crop-residue evidence. AI-assisted document reading, cross-claim conflict detection, independent human review and blockchain-ready integrity proofs make claims easier to investigate and harder to alter unnoticed.

## Inspiration

Moving residue is only part of the challenge. Organizations need credible evidence of quantities, independent delivery confirmation, explanations of discrepancies and protection against counting the same receipt twice. A marketplace listing or blockchain hash alone does not provide that assurance.

## What it does

BioProof follows declarations through pickup, processor intake and audit. Its conflict graph links reused receipts and identical document bytes. Reviewers inspect original sources, document findings, request clarification and append decisions or disputes. Proof replay explains the event chain; the Integrity Test Lab reveals altered history on a copy. SoilSafe keeps site-specific soil context visible.

## How it was built

Next.js, React and strict TypeScript power the interface and APIs. Supabase is the operational Auth/PostgreSQL/private Storage platform. Zod validates actor inputs and Gemini suggestions. Canonical SHA-256 chains preserve record consistency. An authorized Solidity registry supports approved-root anchoring on Sepolia. Vitest, PostgreSQL migration tests, Hardhat execution and desktop/mobile Playwright tests validate local behavior.

## Demonstrated today

The local synthetic demo runs without credentials and exercises shared custody, conflict, audit, proof and advisory logic. Operational migrations/routes and private-storage, Gemini and Sepolia integrations are implemented for configuration.

External services are not presented as live: hosted Supabase, actual Gemini inference and confirmed public testnet anchoring still need credentials and smoke tests. No public deployment, recorded video, field pilot or certified environmental outcome is claimed.

## Differentiation

“Two claims. One receipt.” connects cross-submission evidence. “One altered number. Broken proof.” makes integrity understandable. “Collected does not always mean sustainable.” prevents overlooking soil-health tradeoffs.

## Adoption and next steps

Cooperatives, residue aggregators and sustainability teams could prepare evidence for independent review. Field pilots must assess usability, identity assurance, measurements and reviewer independence. Scaling needs indexed queries, organization scopes, managed signing and document scanning. Environmental estimates require a separately justified methodology.

## Submission checklist

- Source: https://github.com/PrincePundir123/bioproof-climatechain
- Primary track: Sustainable Supply Chains.
- Live URL: not deployed; fill after configuration.
- Video: not recorded/uploaded; use DEMO_SCRIPT.md.
- Screenshots: generated from actual local browser tests.
- Confirm team/eligibility directly against the official rules.
- Deadline checked October 24, 2026: Devpost displays October 25 at 17:00 UTC+03 = **19:30 IST**. Recheck before submission.
- Official page: https://ieee-climatechain-hack.devpost.com/

This is prepared submission text, not a submitted project.
