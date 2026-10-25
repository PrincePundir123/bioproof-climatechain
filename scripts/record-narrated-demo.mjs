// Record real prototype interactions against the narration's eight chapters.
// No production writes, fabricated AI responses, or batch anchor transactions.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const output = path.resolve("docs/submission");
const scratch = path.resolve("test-results/narrated-recording");
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(scratch, { recursive: true });
const base = process.env.DEMO_RECORD_BASE_URL || "http://127.0.0.1:3101";
const rehearsal = process.argv.includes("--rehearsal");
const scale = rehearsal ? 0.015 : 1;
const escape = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const report = JSON.parse(
  fs.readFileSync("test-results/submission-unit-results.json", "utf8"),
);
if (!report.success || report.numFailedTests)
  throw new Error("A fresh passing test report is required.");
const narration = fs.readFileSync("docs/VIDEO_NARRATION.md", "utf8");
const boundaries = [0, 25, 55, 90, 130, 165, 205, 240, 280];
const paragraphs = [
  ...narration.matchAll(/\*\*Narration:\*\* ([\s\S]*?)(?=\n\n##)/g),
].map((m) => m[1].trim());
if (paragraphs.length !== 8)
  throw new Error("Expected eight narration chapters.");
const subtitles = [];
for (const [i, text] of paragraphs.entries()) {
  const sentences = text
    .match(/[^.!?]+[.!?]+(?:\s|$)/g)
    ?.map((s) => s.trim()) || [text];
  const total = sentences.reduce((n, s) => n + s.split(/\s+/).length, 0);
  let elapsed = boundaries[i];
  for (const sentence of sentences) {
    const end =
      elapsed +
      ((boundaries[i + 1] - boundaries[i]) * sentence.split(/\s+/).length) /
        total;
    subtitles.push({ start: elapsed, end, text: sentence });
    elapsed = end;
  }
}
function stamp(seconds, sep = ",") {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`;
}
if (!rehearsal) {
  fs.writeFileSync(
    path.join(output, "stubbletrail-narration.srt"),
    subtitles
      .map(
        (s, i) =>
          `${i + 1}\n${stamp(s.start)} --> ${stamp(s.end)}\n${s.text}\n`,
      )
      .join("\n"),
  );
  fs.writeFileSync(
    path.join(output, "stubbletrail-voiceover.txt"),
    paragraphs.join("\n\n"),
  );
}

// Preview the actual repository component; do not simulate extraction or confirmation.
const componentFile = path.join(scratch, "evidence-preview.mjs");
fs.writeFileSync(
  componentFile,
  ts.transpileModule(
    fs.readFileSync("src/components/evidence-viewer.tsx", "utf8"),
    {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText,
);
const { EvidenceViewer } = await import(pathToFileURL(componentFile).href);
const inspector = renderToStaticMarkup(
  React.createElement(EvidenceViewer, { id: "interface-preview" }),
);
const syntheticSource = await fetch(
  base + "/api/demo-evidence/BP-001-intake",
).then((r) => {
  if (!r.ok) throw new Error("Synthetic source unavailable.");
  return r.text();
});
const homeHTML = await fetch(base).then((r) => r.text());
const cssLinks = [...homeHTML.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)]
  .map((m) => m[0].replace(/href="\//g, `href="${base}/`))
  .join("");
const aiResults = report.testResults
  .flatMap((suite) => suite.assertionResults)
  .filter((a) => /extraction|Gemini|quota|AI|budget|confirm/i.test(a.fullName));
const registry = {
  address: "0x299a81458a942CbAc39A24C95c7175CE758d9E26",
  expectedAuthority: "0x722aEA4101DFFF8b26711F3F2Ca36d4472681371",
};
async function rpc(method, params) {
  const r = await fetch("https://ethereum-sepolia-rpc.publicnode.com", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json();
  if (data.error || !data.result) throw new Error("Registry read failed.");
  return data.result;
}
try {
  const [chain, code, authority] = await Promise.all([
    rpc("eth_chainId", []),
    rpc("eth_getCode", [registry.address, "latest"]),
    rpc("eth_call", [{ to: registry.address, data: "0xbf7e214f" }, "latest"]),
  ]);
  registry.chain = Number(BigInt(chain));
  registry.codePresent = code !== "0x";
  registry.authority = "0x" + authority.slice(-40);
  registry.verified =
    registry.chain === 11155111 &&
    registry.codePresent &&
    registry.authority.toLowerCase() ===
      registry.expectedAuthority.toLowerCase();
} catch {
  registry.verified = false;
}

function document(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title>${cssLinks}<style>
  body{background:#f6f6ef;color:#183f32;font-family:Arial,sans-serif;margin:0}main{max-width:1300px;margin:70px auto 170px;padding:35px}h1{font-size:42px;line-height:1.15}h2{font-size:28px}p,li{font-size:22px;line-height:1.6}.tag{font-size:14px;letter-spacing:2px;font-weight:700;color:#657544}.card{padding:28px;border:1px solid #d9e1d4;background:white;border-radius:16px;margin:18px 0}.two{display:grid;grid-template-columns:1fr 1fr;gap:24px}pre{font-size:19px;white-space:pre-wrap;overflow-wrap:anywhere}.big{font-size:68px;font-weight:700}.passed{color:#267244}small{font-size:16px}textarea{font-size:17px!important}button{cursor:default!important}.evidence-viewer p{font-size:19px}.evidence-viewer{margin-top:25px}
  </style></head><body><main>${body}</main></body></html>`;
}
const testCards = (items) =>
  items
    .map(
      (a) =>
        `<div class="card"><span class="passed">PASS</span> ${escape(a.fullName)}</div>`,
    )
    .join("");
const pages = {
  inspector: document(
    "Actual evidence inspector - interface preview",
    `<div class="tag">ACTUAL REPOSITORY COMPONENT · INTERFACE PREVIEW</div><h1>Read the document. Review every field.</h1><p>No live AI request or confirmation is performed in this preview. The demonstration source remains synthetic.</p>${inspector}`,
  ),
  ai: document(
    "AI integration - actual test results",
    `<div class="tag">GENUINE LOCAL TEST RUN · ${escape(new Date(report.startTime).toISOString())}</div><h1>AI assists. The uploader confirms.</h1><p>Automated tests exercise extraction validation, permissions, usage limits and explicit confirmation. These are test results, not a live Gemini response.</p>${testCards(aiResults)}`,
  ),
  registry: document(
    "Sepolia registry - read-only technical check",
    `<div class="tag">READ-ONLY PUBLIC RPC CHECK · NO TRANSACTION SENT</div><h1>External commitments on Sepolia.</h1><div class="card"><h2>${registry.verified ? "Contract and authority verified" : "Deployed registry configuration"}</h2><p>Network: Ethereum Sepolia ${registry.chain || "(configured)"}</p><pre>${registry.address}</pre><p>Signing authority ${registry.verified ? "matches the configured public signer" : "not reverified in this recording"}.</p><pre>${escape(registry.authority || registry.expectedAuthority)}</pre></div><div class="card"><h2>Deployment and a batch anchor are separate.</h2><p>This synthetic example has no confirmed anchor. A successful transaction and a matching registry proof are both required for confirmation.</p></div><p>Read-only technical summary. Contract: sepolia.etherscan.io/address/${registry.address}</p>`,
  ),
  tests: document(
    "Current automated test evidence",
    `<div class="tag">GENUINE VITEST REPORT · ${escape(new Date(report.startTime).toISOString())}</div><h1>Technical evidence, beyond the interface.</h1><div class="two"><div class="card"><div class="big">${report.numPassedTests}</div><h2>Tests passing</h2><p>Unit, API and database coverage</p></div><div class="card"><h2>Application stack</h2><p>Next.js + React<br>Supabase authentication and private storage<br>Gemini document extraction<br>Solidity registry on Sepolia</p></div></div><h2>Current passing suites</h2>${report.testResults.map((s) => `<div class="card"><span class="passed">PASS</span> ${escape(path.basename(s.name))} <small>(${s.assertionResults.length} tests)</small></div>`).join("")}`,
  ),
  adoption: document(
    "Adoption and next steps",
    `<div class="tag">PROTOTYPE ROADMAP · NOT FIELD-PILOT RESULTS</div><h1>Make supply-chain claims easier to examine.</h1><div class="two"><div class="card"><h2>Who it serves</h2><p>Farmer cooperatives<br>Residue aggregators<br>Independent reviewers</p></div><div class="card" id="roadmap"><h2>Next steps</h2><p>Hosted acceptance testing<br>Organization-scoped access<br>Scalable conflict queries<br>A documented field pilot</p></div></div><div class="card"><h2>Accountable evidence. Clear limits.</h2><p>Recorded quantities are not certified climate benefits. Physical verification and site-specific assessment remain essential.</p></div><h2>StubbleTrail</h2><p>https://stubbletrail.vercel.app/<br>github.com/PrincePundir123/bioproof-climatechain</p>`,
  ),
  source: document(
    "Actual synthetic source document",
    `<div class="tag">ACTUAL DEMO SOURCE · NOT A REAL RECEIPT</div><h1>Compare suggestions with the original.</h1><div class="card"><pre>${escape(syntheticSource)}</pre></div><p>This source is available from the prototype's synthetic-document endpoint.</p>`,
  ),
};
const chapters = [
  "StubbleTrail · Sustainable Supply Chains",
  "The problem · 600 kg collected, 560 kg received",
  "Four roles · one accountable history",
  "AI assistance · human confirmation",
  "Cross-claim signals · SoilSafe review",
  "Integrity · change a copy, test the proof",
  "Public verification · Sepolia commitments",
  "Technical evidence · adoption and next steps",
];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  reducedMotion: "no-preference",
  ...(rehearsal
    ? {}
    : { recordVideo: { dir: output, size: { width: 1600, height: 900 } } }),
});
const summary = (name) => `${base}/__recording/${name}`;
await context.route(`${base}/__recording/**`, (route) => {
  const name = new URL(route.request().url()).pathname.split("/").at(-1);
  return route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: pages[name] || "Not found",
  });
});
const started = Date.now();
const page = await context.newPage();
const video = page.video();
page.setDefaultTimeout(10000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(
  ({ subtitles, boundaries, chapters, started, scale }) => {
    function install() {
      if (!document.body || document.getElementById("recording-overlay"))
        return;
      const overlay = document.createElement("div");
      overlay.id = "recording-overlay";
      overlay.innerHTML =
        '<div id="recording-chapter"></div><div id="recording-caption"></div><div id="recording-pointer"></div>';
      const style = document.createElement("style");
      style.textContent = `#recording-chapter{position:fixed;right:18px;top:12px;z-index:2147483647;background:#143b30ed;color:#fff;padding:10px 18px;border-radius:8px;font:600 15px Arial;pointer-events:none}#recording-caption{position:fixed;bottom:12px;left:9%;width:82%;box-sizing:border-box;z-index:2147483647;background:#102e26f5;color:#fff;border:1px solid #ffffff25;padding:15px 24px;border-radius:10px;font:21px/1.45 Arial;text-align:center;pointer-events:none;box-shadow:0 4px 20px #0003}#recording-pointer{position:fixed;left:-50px;top:-50px;z-index:2147483647;width:20px;height:20px;border:2px solid #b27a30;border-radius:50%;background:#d7ac5b33;transform:translate(-50%,-50%);pointer-events:none}body{padding-bottom:125px!important}html{scroll-behavior:smooth}*:focus-visible{outline:3px solid #b88039;outline-offset:4px}`;
      document.head.append(style);
      document.body.append(overlay);
      document.addEventListener("mousemove", (e) => {
        const pointer = document.getElementById("recording-pointer");
        pointer.style.left = `${e.clientX}px`;
        pointer.style.top = `${e.clientY}px`;
      });
      setInterval(() => {
        const seconds = (Date.now() - started) / 1000 / scale;
        const i = Math.max(
          0,
          boundaries.findLastIndex((b) => b <= seconds),
        );
        document.getElementById("recording-chapter").textContent =
          chapters[Math.min(i, 7)] + " · prototype recording";
        const sub = subtitles.find(
          (s) => seconds >= s.start && seconds < s.end,
        );
        document.getElementById("recording-caption").textContent =
          sub?.text || "StubbleTrail · From field residue to trusted evidence";
      }, 100);
    }
    document.addEventListener("DOMContentLoaded", install);
  },
  { subtitles, boundaries, chapters, started, scale },
);
let mouse = { x: 600, y: 300 };
const steps = [];
async function wait(seconds) {
  await page.waitForTimeout(rehearsal ? 20 : seconds * 1000);
}
async function go(route) {
  await page.goto(route.startsWith("http") ? route : base + route, {
    waitUntil: "domcontentloaded",
  });
  await page.locator("h1").first().waitFor();
  await wait(0.8);
}
async function focus(locator) {
  await locator.first().waitFor();
  await locator.first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    window.scrollTo({
      top: Math.max(0, scrollY + r.top - 170),
      behavior: "smooth",
    });
  });
  await wait(1.15);
  const box = await locator.first().boundingBox();
  const target = {
    x: Math.min(1550, Math.max(20, box.x + Math.min(box.width / 2, 230))),
    y: Math.min(730, Math.max(50, box.y + Math.min(box.height / 2, 70))),
  };
  const count = rehearsal ? 1 : 32;
  const origin = { ...mouse };
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    const eased = t * t * (3 - 2 * t);
    await page.mouse.move(
      origin.x + (target.x - origin.x) * eased,
      origin.y + (target.y - origin.y) * eased,
    );
    if (!rehearsal) await page.waitForTimeout(14);
  }
  mouse = target;
}
async function click(locator) {
  await focus(locator);
  await wait(0.35);
  await locator.first().click();
}
async function type(locator, value) {
  await focus(locator);
  await locator.first().fill("");
  await locator.first().pressSequentially(value, { delay: rehearsal ? 0 : 85 });
}
async function step(at, title, action) {
  const due = started + at * 1000 * scale;
  if (Date.now() < due) await page.waitForTimeout(due - Date.now());
  const actual = (Date.now() - started) / 1000;
  console.log(`${stamp(actual, ".")} ${title}`);
  steps.push({ plannedSeconds: at, actualSeconds: actual, title });
  if (!rehearsal && actual - at > 2.5)
    throw new Error(`Recording drift exceeded 2.5 seconds at ${title}`);
  await action();
  if (
    rehearsal &&
    [0, 55, 67, 77, 102, 109, 123, 130, 165, 183, 205, 214, 240, 272].includes(
      at,
    )
  )
    await page.screenshot({ path: path.join(scratch, `rehearsal-${at}.png`) });
}
try {
  await step(0, "Homepage introduction", () => go("/"));
  await step(7, "Field photography", () => focus(page.locator(".hero-visual")));
  await step(14, "Four-stage journey", () =>
    focus(page.locator(".journey-ribbon")),
  );
  await step(20, "Real agriculture imagery", () =>
    focus(page.locator(".photo-story-grid")),
  );
  await step(25, "Open the synthetic custody discrepancy", () =>
    go("/demo/batches/BP-001"),
  );
  await step(31, "Collector measurement", () =>
    focus(page.locator(".custody-card .metrics > div").nth(1)),
  );
  await step(37, "Processor measurement", () =>
    focus(page.locator(".custody-card .metrics > div").nth(2)),
  );
  await step(43, "Supporting source records", () =>
    focus(page.locator(".source-card")),
  );
  await step(49, "Accountable review decision", () =>
    focus(page.locator(".action-card")),
  );
  await step(55, "Farmer plot and declaration form", async () => {
    await go("/demo/new");
    await page.getByLabel("Demo role").selectOption("FARMER");
    await focus(page.getByLabel("Registered plot"));
  });
  await step(58, "Farmer estimated quantity", () =>
    type(page.getByLabel("Estimated available quantity"), "950"),
  );
  await step(62, "Collector pickup record", async () => {
    await go("/demo/batches/BP-002");
    await page.getByLabel("Demo role").selectOption("COLLECTOR");
    await focus(page.locator(".custody-card .metrics > div").nth(1));
  });
  await step(67, "Independent processor intake record", async () => {
    await page.getByLabel("Demo role").selectOption("PROCESSOR");
    await focus(page.locator(".custody-card .metrics > div").nth(2));
  });
  await step(72, "Source documents attached to this record", () =>
    focus(page.locator(".source-card")),
  );
  await step(77, "Independent auditor review controls", async () => {
    await page.getByLabel("Demo role").selectOption("AUDITOR");
    await focus(page.locator(".action-card"));
  });
  await step(83, "Explicitly isolated demonstration roles", () =>
    focus(page.getByLabel("Demo role")),
  );
  await step(90, "Inspect an actual synthetic source", () =>
    go(summary("source")),
  );
  await step(96, "Read source quantity and receipt", () =>
    focus(page.locator("pre")),
  );
  await step(102, "Actual AI inspector component - labeled preview", () =>
    go(summary("inspector")),
  );
  await step(109, "Review editable extraction schema", () =>
    focus(page.getByLabel("Editable extracted fields (JSON)")),
  );
  await step(116, "Explicit human confirmation control", () =>
    focus(page.getByRole("button", { name: "Confirm reviewed fields" })),
  );
  await step(123, "Real AI permission, quota and confirmation tests", () =>
    go(summary("ai")),
  );
  await step(130, "Cross-claim evidence graph", () => go("/demo/conflicts"));
  await step(137, "Inspect BP-002 connection", () =>
    click(page.getByRole("button", { name: "BP-002", exact: true })),
  );
  await step(143, "Shared receipt and source findings", () =>
    focus(page.getByRole("heading", { name: "Investigation records" })),
  );
  await step(151, "Site-specific SoilSafe guard", async () => {
    await go("/demo/batches/BP-004");
    await focus(page.locator(".soil-card"));
  });
  await step(158, "SoilSafe assessment explanation", () =>
    focus(page.locator(".soil-card p")),
  );
  await step(165, "Linked event history", async () => {
    await go("/demo/batches/BP-001");
    await focus(page.locator(".proof-card"));
  });
  await step(169, "Inspect original event content and hash", () =>
    click(page.locator(".timeline-event summary").first()),
  );
  await step(173, "Verify the original chain", () =>
    click(page.getByRole("button", { name: "Verify event chain" })),
  );
  await step(177, "Copy-only integrity laboratory", () => go("/demo/lab"));
  await step(180, "Deliberately change copied quantity", () =>
    type(page.getByLabel("Replacement quantity (kg)"), "601"),
  );
  await step(183, "Run the actual integrity check", async () => {
    await click(page.getByRole("button", { name: "Run integrity test" }));
    await page
      .getByRole("status")
      .filter({ hasText: "Integrity mismatch" })
      .waitFor();
  });
  await step(188, "Original remains unchanged", () =>
    focus(page.getByRole("status").filter({ hasText: "Integrity mismatch" })),
  );
  await step(194, "Limits of an unanchored chain", () =>
    focus(page.getByRole("heading", { name: "What this demonstrates" })),
  );
  await step(201, "External reference and no fabricated anchor", () =>
    focus(
      page.getByText("No testnet anchor is fabricated for this lab.", {
        exact: true,
      }),
    ),
  );
  await step(205, "Public verification result", () => go("/verify/BP-001"));
  await step(212, "Redacted custody and public QR", () =>
    focus(page.getByRole("heading", { name: "Recorded custody" })),
  );
  await step(214, "Real registry read-only technical evidence", () =>
    go(summary("registry")),
  );
  await step(220, "Actual Sepolia registry and public authority", () =>
    focus(page.locator("pre").first()),
  );
  await step(225, "Distinguish deployment from anchoring", () =>
    focus(
      page.getByRole("heading", {
        name: "Deployment and a batch anchor are separate.",
      }),
    ),
  );
  await step(231, "The synthetic sample has no confirmed anchor", async () => {
    await go("/verify/BP-001");
    await focus(page.getByRole("heading", { name: "No confirmed anchor" }));
  });
  await step(236, "Public integrity result, without physical guarantees", () =>
    focus(page.getByRole("heading", { name: "Local chain matches" })),
  );
  await step(240, "Fresh passing tests and actual application stack", () =>
    go(summary("tests")),
  );
  await step(248, "Read current passing suite names", () =>
    focus(page.getByRole("heading", { name: "Current passing suites" })),
  );
  await step(257, "Cooperatives, aggregators and independent reviewers", () =>
    go(summary("adoption")),
  );
  await step(263, "Concrete prototype roadmap", () =>
    focus(page.locator("#roadmap")),
  );
  await step(272, "Clear limits and final project links", () =>
    focus(page.getByRole("heading", { name: "StubbleTrail", exact: true })),
  );
  await step(280, "End of narration", async () => {});
  const meta = {
    durationSeconds: (Date.now() - started) / 1000,
    rehearsal,
    registry,
    errors,
    steps,
    subtitles,
  };
  fs.writeFileSync(
    path.join(scratch, rehearsal ? "rehearsal.json" : "recording.json"),
    JSON.stringify(meta, null, 2),
  );
  if (!rehearsal)
    await page.screenshot({ path: path.join(scratch, "final-frame.png") });
  await context.close();
  if (video) {
    const destination = path.join(
      output,
      "stubbletrail-narration-matched.webm",
    );
    await video.saveAs(destination);
    const original = await video.path();
    if (path.resolve(original) !== destination) fs.unlinkSync(original);
    console.log(`SAVED ${destination}`);
  }
  if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
} finally {
  await context.close().catch(() => {});
  await browser.close();
}
