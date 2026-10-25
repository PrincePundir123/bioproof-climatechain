# StubbleTrail: professional hackathon narration script

Target edited length: 4 minutes 40 seconds. Official allowed length: 3-5 minutes.
Use a measured pace around 130-140 words per minute, leaving short pauses for screen changes.
Timing is an editing target, not a guaranteed speaking duration. Rehearse once and keep the final export under five minutes.

Read only the narration paragraphs. Screen directions are not spoken.

## Before recording

- Use StubbleTrail as the title; explain the current BioProof interface label once using a small on-screen note.
- Keep synthetic-data labels visible when showing demo scenarios.
- Prepare the screen clips first, then record the voiceover; remove login typing, network waits and repeated clicks.
- Never show .env.local, passwords, API keys or the signing private key.
- For AI, show a genuine extraction result only if available. Otherwise show the inspector and passing tests/readiness output, and retain the narration saying the synthetic-PDF integration was verified separately.
- For blockchain, show the deployed registry, but do not describe registry deployment as a confirmed anchor for a batch.
- Use the deployed app where practical. If recording the local production preview, label it as a prototype demo and include the live URL on the final card.

## 0:00-0:25 | Introduction and track

**Screen:** Show the homepage with a small title card: StubbleTrail | Sustainable Supply Chains | Solo project. Add a small note: Earlier interface name: BioProof.

**Narration:** Hi, I'm [your name], the solo developer of StubbleTrail, built for the Sustainable Supply Chains track. StubbleTrail connects agricultural residue to an inspectable evidence trail, from farmer declaration to independent review. The question behind this project is simple: when a sustainability claim is made, can we examine the records supporting it?

## 0:25-0:55 | The problem, shown through a concrete example

**Screen:** Open /demo/batches/BP-001. Point to the declaration, pickup and intake quantities. Keep SYNTHETIC DATA visible.

**Narration:** Consider this synthetic example. A collector records six hundred kilograms, but the processor receives five hundred and sixty. Without connected records, the difference is difficult to investigate. A receipt might also be reused across separate claims. StubbleTrail brings measurements, documents and accountable decisions together, helping reviewers investigate discrepancies before relying on a supply-chain claim. These examples demonstrate the prototype; they are not field-pilot results.

## 0:55-1:30 | The four-role workflow

**Screen:** Use prepared short clips: farmer declaration; collector pickup; processor intake and evidence; auditor review. Skip login typing and waiting. Demo role switching must remain labeled.

**Narration:** The workflow has four distinct roles. A farmer registers a plot and declares available residue. A collector records pickup quantity, measurement basis and event time. A processor independently records intake, the facility and receipt details. Supporting documents are attached to the batch, and an auditor reviews the evidence and findings before recording a decision. In the operational application, permissions are checked on the server; the role selector shown here belongs only to the isolated demo.

## 1:30-2:10 | AI assistance with human confirmation

**Screen:** Show the evidence inspector, original document, extraction controls and editable JSON. Include an actual extraction clip only if one is ready. Otherwise show the inspector and the passing AI tests/readiness check, labeled as such.

**Narration:** AI assists with document reading. The Gemini integration has been verified using a synthetic PDF, extracting its receipt number and weight correctly. In the application, the uploader can request structured fields, compare each suggestion with the original document and correct uncertain values. Confirmation appends a review event; it does not silently replace a custody measurement or approve the batch. Original files remain private, and extraction requests are subject to database-enforced usage limits. Human accountability remains part of the process.

## 2:10-2:45 | Investigation signals and climate responsibility

**Screen:** Show /demo/conflicts, select the BP-002/BP-003 relationship, then show BP-004's SoilSafe panel. Do not spend time scrolling through every finding.

**Narration:** StubbleTrail also looks across claims. Here, two synthetic batches share a receipt identifier and identical file bytes. The graph makes that relationship visible, while the reviewer documents an explanation. A match is an investigation signal, not proof of fraud. SoilSafe adds another question: how much residue is proposed for removal? It keeps soil cover, nutrients and site-specific review in view, without claiming a universal safe removal threshold.

## 2:45-3:25 | Hash integrity and tamper demonstration

**Screen:** Show Verify event chain, then /demo/lab. Change the copied quantity to 601 and click Run integrity test. Hold on the mismatch message.

**Narration:** Each event is linked to the previous event through a canonical SHA-256 hash chain. Let me demonstrate the integrity check: the recorded chain verifies, but changing a quantity in this copied event produces a mismatch. The original record remains unchanged. This makes alterations detectable against the recorded history. It is not a guarantee against a database administrator rewriting an unanchored chain, which is why the project also supports external commitments on Ethereum Sepolia.

## 3:25-4:00 | Public verification and the real blockchain integration

**Screen:** Open /verify/BP-001 and its QR, then briefly show the actual registry explorer page. Clearly distinguish registry deployment from anchoring a batch.

**Narration:** The public portal presents a redacted record, custody summary and verification result without exposing private source files or identities. The Solidity registry is deployed on Sepolia with a verified signing authority. Approved real records can commit their approved event root to that contract. A confirmed status requires both a successful transaction and a matching registry proof. This synthetic sample intentionally shows no confirmed anchor. Blockchain helps verify record integrity; it cannot prove a physical delivery occurred.

## 4:00-4:40 | Technical evidence, adoption and closing

**Screen:** Show the README/architecture and genuine passing test output briefly, then finish on the homepage or an end card containing the live app and public repository links.

**Narration:** The prototype is deployed, with Supabase authentication and private storage, Gemini extraction, and the Sepolia registry. Ninety-three automated unit, API and database tests pass, alongside desktop and mobile workflow tests and local contract checks. The intended users are cooperatives, residue aggregators and independent reviewers. Next steps include hosted acceptance testing, organization-scoped access, scalable conflict queries and a documented field pilot. StubbleTrail aims to make sustainable supply-chain claims easier to examine, without presenting recorded quantities as certified climate benefits. Thank you.

## Final screen

StubbleTrail - From field residue to trusted evidence.
Track: Sustainable Supply Chains | Solo submission
Live: https://stubbletrail.vercel.app/
Source: https://github.com/PrincePundir123/bioproof-climatechain

## Judging coverage

| Criterion            | Where it is addressed                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Climate relevance    | Residue sourcing, accountable claims and SoilSafe; no invented emissions estimates        |
| Originality          | Cross-claim evidence relationships, reviewer reasoning and soil-context awareness         |
| Technical execution  | Four-role workflow, AI confirmation, tamper check, public redaction and deployed registry |
| Practical usefulness | Target users, operational controls and concrete scaling roadmap                           |
| Presentation         | A concrete discrepancy, visible actions and a clear explanation of limits                 |

## Recording and export

- Aim for 4:40; trim pauses rather than rushing technical explanations.
- Record at 1080p if available, with clear microphone audio and readable browser zoom.
- Keep music absent or low enough that every spoken word is clear.
- Watch the complete exported video once before uploading.
- Upload as public or unlisted and verify the link in an incognito window.

## Official requirements checked 25 October 2026

Overview: https://ieee-climatechain-hack.devpost.com/
Rules: https://ieee-climatechain-hack.devpost.com/rules
Required video length: 3-5 minutes.
Deadline currently listed: 26 October 2026, 00:00 UTC+03 = 26 October 2026, 02:30 IST.
Check the submission form again before final submission.
