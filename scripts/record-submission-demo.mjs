import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const output = path.resolve("docs/submission");
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  reducedMotion: "reduce",
  recordVideo: { dir: output, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
const video = page.video();
const base = process.env.DEMO_RECORD_BASE_URL || "http://127.0.0.1:3101";
const scenes = [];
const started = Date.now();
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
let batchId;

async function caption(title, text) {
  await page.evaluate(
    ({ title, text }) => {
      let box = document.getElementById("submission-caption");
      if (!box) {
        box = document.createElement("div");
        box.id = "submission-caption";
        Object.assign(box.style, {
          position: "fixed",
          bottom: "0",
          left: "0",
          right: "0",
          zIndex: "2147483647",
          background: "#123d2bf5",
          color: "#fff",
          padding: "17px 30px",
          fontFamily: "Arial, sans-serif",
          boxShadow: "0 -2px 12px #0002",
          pointerEvents: "none",
          lineHeight: "1.45",
        });
        document.body.append(box);
      }
      box.replaceChildren();
      const heading = document.createElement("div");
      heading.textContent = title;
      Object.assign(heading.style, {
        fontSize: "20px",
        fontWeight: "700",
        color: "#d5e5a2",
        marginBottom: "5px",
      });
      const body = document.createElement("div");
      body.textContent = text;
      body.style.fontSize = "17px";
      box.append(heading, body);
    },
    { title, text },
  );
}

async function scene(title, text, duration, action, image) {
  console.log("RECORDING: " + title);
  const start = Date.now();
  scenes.push({ start: Math.round((start - started) / 1000), title, text });
  await action();
  await caption(title, text);
  if (image)
    await page.screenshot({
      path: path.join(output, image),
      type: "jpeg",
      quality: 85,
    });
  const remaining = duration * 1000 - (Date.now() - start);
  if (remaining > 0) await page.waitForTimeout(remaining);
}
async function goto(route) {
  await page.goto(base + route, { waitUntil: "domcontentloaded" });
  await page.locator("h1").waitFor();
}
try {
  await scene(
    "StubbleTrail | From field residue to trusted evidence",
    "A solo IEEE ClimateChain project for Sustainable Supply Chains. The current interface retains its earlier BioProof name.",
    20,
    () => goto("/"),
    "01-home.jpg",
  );
  await scene(
    "The problem: fragmented custody records",
    "This labeled synthetic example records 600 kg collected and 560 kg received. Reviewers inspect the measurements, supporting sources and documented decision.",
    25,
    () => goto("/demo/batches/BP-001"),
    "02-custody.jpg",
  );
  await scene(
    "Two claims. One receipt.",
    "The conflict graph connects receipt reuse and identical file hashes. These are investigation signals, not automatic fraud accusations.",
    25,
    () => goto("/demo/conflicts"),
    "03-conflicts.jpg",
  );
  await scene(
    "Farmer | Create and declare",
    "The next four scenes are an automated practice journey using synthetic inputs and demo roles. No real observations or approvals are being recorded.",
    25,
    async () => {
      await goto("/demo");
      await page.getByLabel("Demo role").selectOption("FARMER");
      await page.getByRole("link", { name: "New batch", exact: true }).click();
      await page
        .getByLabel("General origin region")
        .fill("SUBMISSION DEMO � synthetic data");
      await page.getByLabel("Estimated available quantity").fill("1000");
      await page.getByLabel("Mass basis", { exact: true }).selectOption("dry");
      await page.getByLabel("Total generated residue").fill("2000");
      await page.getByRole("button", { name: "Create draft record" }).click();
      await page
        .getByRole("status")
        .filter({ hasText: "Created BP-" })
        .waitFor();
      batchId = (await page.getByRole("status").innerText()).match(
        /Created (BP-[A-F0-9]+)/,
      )[1];
      await page
        .getByRole("link", { name: "All batches", exact: true })
        .click();
      await page.waitForURL(base + "/demo", { timeout: 45000 });
      await page
        .getByRole("link", { name: "Open " + batchId, exact: true })
        .click();
      await page.getByRole("button", { name: "Submit declaration" }).click();
      await page.locator(".status-declared").waitFor();
    },
  );
  await scene(
    "Collector | Independent pickup and source file",
    "The collector records a practice measurement, timestamp and explanation, then attaches a clearly labeled test file. The demo hashes actual file bytes.",
    30,
    async () => {
      await page.getByLabel("Demo role").selectOption("COLLECTOR");
      await page.locator('input[name="kg"]').fill("1000");
      await page.locator('select[name="basis"]').selectOption("dry");
      await page.locator('input[name="time"]').fill("2026-10-25T09:00");
      await page
        .locator('textarea[name="notes"]')
        .fill(
          "SYNTHETIC DEMO collector measurement. No physical collection is claimed.",
        );
      await page
        .getByRole("button", { name: "Confirm pickup", exact: true })
        .click();
      await page.locator(".status-picked_up").waitFor();
      await page.locator('input[type="file"]').setInputFiles({
        name: "SYNTHETIC-TEST-pickup.png",
        mimeType: "image/png",
        buffer: png,
      });
      await page
        .getByRole("status")
        .filter({ hasText: "Actual file bytes hashed" })
        .waitFor();
    },
  );
  await scene(
    "Processor | Intake, evidence and review request",
    "The processor independently records intake. Production evidence is private; Gemini can suggest document fields for uploader review and explicit confirmation.",
    35,
    async () => {
      await page.getByLabel("Demo role").selectOption("PROCESSOR");
      await page.locator('input[name="kg"]').fill("1000");
      await page.locator('select[name="basis"]').selectOption("dry");
      await page.locator('input[name="time"]').fill("2026-10-25T11:00");
      await page.locator('input[name="receipt"]').fill("SYNTHETIC-DEMO-1000");
      await page
        .locator('input[name="facility"]')
        .fill("Synthetic demonstration facility");
      await page
        .locator('textarea[name="notes"]')
        .fill(
          "SYNTHETIC DEMO intake measurement. No real delivery is claimed.",
        );
      await page
        .getByRole("button", { name: "Confirm intake", exact: true })
        .click();
      await page.locator(".status-received").waitFor();
      await page.locator('input[type="file"]').setInputFiles({
        name: "SYNTHETIC-TEST-intake.png",
        mimeType: "image/png",
        buffer: Buffer.concat([png, Buffer.from("SYNTHETIC DEMO intake")]),
      });
      await page
        .getByRole("status")
        .filter({ hasText: "Actual file bytes hashed" })
        .waitFor();
      await page
        .getByRole("button", { name: "Request audit review", exact: true })
        .click();
      await page.locator(".status-under_review").waitFor();
    },
  );
  await scene(
    "Auditor | Human decision and linked history",
    "A separate demo auditor documents review and a practice decision. SoilSafe is advisory. The event-chain check detects changes to recorded history.",
    35,
    async () => {
      await page.getByLabel("Demo role").selectOption("AUDITOR");
      await page
        .getByLabel("Document agronomic review", { exact: true })
        .fill(
          "SYNTHETIC DEMO only. No field assessment or professional agronomic attestation is claimed.",
        );
      await page
        .getByRole("button", { name: "Document agronomic review", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Recorded in this isolated demo session" })
        .waitFor();
      await page
        .getByLabel("Approve evidence", { exact: true })
        .fill(
          "SYNTHETIC DEMO practice decision: two matching practice measurements and labeled test files.",
        );
      page.once("dialog", (dialog) => dialog.accept());
      await page
        .getByRole("button", { name: "Approve evidence", exact: true })
        .click();
      await page.locator(".status-approved").waitFor();
      await page.getByRole("button", { name: "Verify event chain" }).click();
      await page
        .getByRole("status")
        .filter({ hasText: "Local hash chain verified" })
        .waitFor();
    },
  );
  await scene(
    "One altered number breaks the proof",
    "The integrity lab changes a copy of an event. Verification detects the mismatch while the original record stays unchanged.",
    30,
    async () => {
      await goto("/demo/lab");
      await page.getByLabel("Replacement quantity (kg)").fill("601");
      await page.getByRole("button", { name: "Run integrity test" }).click();
      await page
        .getByRole("status")
        .filter({ hasText: "Integrity mismatch" })
        .waitFor();
    },
    "04-integrity.jpg",
  );
  await scene(
    "Public inspection | Integrity is not physical truth",
    "The public portal redacts private identities and files. This synthetic sample has no confirmed anchor. A deployed Sepolia registry supports approved real records; 93 automated tests pass.",
    30,
    () => goto("/verify/BP-001"),
    "05-public-proof.jpg",
  );

  fs.writeFileSync(
    path.join(output, "video-scenes.json"),
    JSON.stringify(
      { durationSeconds: Math.round((Date.now() - started) / 1000), scenes },
      null,
      2,
    ),
  );
  await context.close();
  await video.saveAs(path.join(output, "stubbletrail-demo.webm"));
  const original = await video.path();
  if (path.resolve(original) !== path.join(output, "stubbletrail-demo.webm"))
    fs.unlinkSync(original);
  console.log("SAVED: docs/submission/stubbletrail-demo.webm");
} finally {
  await browser.close();
}
