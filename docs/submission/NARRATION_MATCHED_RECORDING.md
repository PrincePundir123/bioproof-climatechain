# Narration-matched screen recording

Open `stubbletrail-narration-matched.webm` in this folder. This is the new recording; `stubbletrail-demo.webm` is the earlier version.

The video targets **4:40**, uses a 1600 × 900 frame, and includes sentence-level subtitles from `docs/VIDEO_NARRATION.md`. Navigation, pointer movement, scrolling, typing and results are distributed through each chapter instead of running all actions at its start.

The exported recording is **4:41** including the final frame. Its 49 scheduled actions began within 0.1 seconds of their cues, and Chromium reported no page errors. Exported frames were checked for readability, subtitle placement, the integrity result, registry details and closing links. The current unit/API/database run passed all 93 tests; the read-only Sepolia check confirmed deployed contract code and the expected public signing authority.

| Time      | Content                                                                 |
| --------- | ----------------------------------------------------------------------- |
| 0:00–0:25 | Introduction, field imagery and supply-chain journey                    |
| 0:25–0:55 | Synthetic 600 kg pickup / 560 kg intake discrepancy                     |
| 0:55–1:30 | Farmer, collector, processor and auditor interfaces                     |
| 1:30–2:10 | Actual synthetic source, labeled inspector preview and current AI tests |
| 2:10–2:45 | Cross-claim graph, receipt findings and SoilSafe                        |
| 2:45–3:25 | Verify original chain, inspect an event and alter a copy                |
| 3:25–4:00 | Public redaction, QR, hash replay and read-only Sepolia check           |
| 4:00–4:40 | Current tests, application stack, intended users, roadmap and links     |

`stubbletrail-voiceover.txt` contains the spoken text. Replace `[your name]` before recording. `stubbletrail-narration.srt` contains the subtitle timings. Subtitles are already visible in the video; the SRT is also provided for editing.

The video has **no audio track**. Its timing follows the written script, rather than a supplied voice recording. Record the narration against these timings, or provide the finished audio file to retime the screen recording to your actual pauses and speaking pace.

The application footage uses the local production preview and isolated synthetic data. Technical summary pages are identified explicitly. The inspector preview renders the actual repository component without sending an AI request or claiming an extraction happened on screen. Current AI tests are shown separately. The Sepolia summary reads the public contract and authority; no transaction or approval is broadcast. Registry deployment is distinct from batch anchoring.

## Reproduce

Start the existing production preview on port 3101, then run:

```powershell
npm test -- --reporter=json --outputFile=test-results/submission-unit-results.json
node scripts/record-narrated-demo.mjs --rehearsal
node scripts/record-narrated-demo.mjs
```

The recorder requires a fresh passing test report. `DEMO_RECORD_BASE_URL` overrides the local preview address. Its read-only registry check uses a public Sepolia endpoint. Runtime timing logs and browser errors are saved under `test-results/narrated-recording/`.

Video files are ignored by Git. Keep the local video and upload the final narrated export to your chosen video host.
