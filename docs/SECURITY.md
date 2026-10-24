# Security and operational limits

Implemented: authenticated server actors; administrator-only role provisioning; custody/ownership access checks; no self-approval; validated transitions/weights/reasoning; origin checks; no-store API responses; nosniff/referrer/frame headers; private files and 60-second signed links; MIME signatures/size bounds; append-only events; optimistic locking/idempotency; atomic AI attempt limits; server-only signer and service key.

The service credential bypasses RLS and must remain secret. Private source explanations are excluded from public output. General origin region is deliberately a generalized input: operators must not enter precise addresses there. The optional private-coordinate column is never included publicly.

This is not a professional security audit. False measurements, collusion, compromised accounts, sophisticated malicious documents and database-superuser attacks remain possible. Signature checks are not antivirus or full decoding. Add file scanning, identity assurance, organization assignments, monitoring and retention controls before field deployment.

AI receives untrusted document data and has no tools or decision authority. Model output is strictly validated. Outages preserve manual recording. Database counters limit attempts to ten per actor/hour.

Anchor recovery: a row is reserved before broadcast. A crash before storing the transaction hash is ambiguous. Inspect the authorized signer history and registry, reconcile the exact hash administratively, and do not blindly resend. A serialized signing worker is needed for high-volume cross-batch nonce management.

Tests cover role failures, history tampering, stale versions, atomic writes, signatures, redaction, AI counters and contract authorization/replay. Hosted Auth/Storage and real AI/RPC still need configuration.

Production dependency audit was clean during implementation. Development-only upstream Hardhat/Solidity advisories are recorded by npm audit; these tools consume only repository-controlled config/source and are not exposed publicly. Recheck the lockfile before deployment and dependency upgrades.
