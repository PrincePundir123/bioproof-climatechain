# StubbleTrail demo recording

The prepared captioned video is docs/submission/stubbletrail-demo.webm.
It records a local production preview of the application and labeled synthetic demo scenarios. The public deployment link is included separately in the submission.
Target duration: approximately 4 minutes 15 seconds. It has embedded captions and no voice narration.

To recreate it:

    npm run build
    npm run start -- --hostname 127.0.0.1 --port 3101
    # In another terminal:
    node scripts/record-submission-demo.mjs

Playwright Chromium must be installed. The default recording base is http://127.0.0.1:3101. Set DEMO_RECORD_BASE_URL to record another authorized preview.
Its practice measurements, evidence bytes and auditor decision stay inside the demo session.
It never signs into a real account or changes Supabase records.

## Scenes

| Approximate time | Scene                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| 0:00?0:20        | StubbleTrail introduction; current interface retains the BioProof name        |
| 0:20?0:45        | Synthetic custody example: 600 kg collected, 560 kg received                  |
| 0:45?1:10        | Duplicate receipts and identical file bytes in the conflict graph             |
| 1:10?1:35        | Farmer creates and declares a new synthetic batch                             |
| 1:35?2:05        | Collector records pickup and attaches labeled test evidence                   |
| 2:05?2:40        | Processor records intake, attaches test evidence and requests review          |
| 2:40?3:15        | Separate demo auditor documents review, approves and verifies the event chain |
| 3:15?3:45        | Integrity lab detects a changed event copy                                    |
| 3:45?4:15        | Redacted public proof and QR; explicitly no confirmed anchor for the sample   |

The finalized video-scenes.json records actual scene start times.
Screenshots are generated beside the video as numbered JPEG files.

## Upload and submit

1. Watch the finished video once and ensure the captions and actions are readable.
2. Upload it to a video host and set it to public or unlisted.
3. Open the resulting link in an incognito window to confirm judges can watch it.
4. Paste that video URL into the Devpost demo-video field.
5. Use HACKATHON_SUBMISSION.md for the remaining project fields and story.

The Sepolia registry deployment and a synthetic Gemini PDF extraction were verified separately.
This recording does not claim that its synthetic sample has a real on-chain anchor or
show fabricated AI output. Real field observations and independent decisions remain separate.
