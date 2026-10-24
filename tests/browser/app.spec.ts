import { test, expect } from "@playwright/test";
test("landing and demo navigation", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Every climate claim/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/landing-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: /Explore live demo/ }).click();
  await expect(
    page.getByRole("heading", { name: "Evidence overview" }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/workspace-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Open BP-001", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Proof replay" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Verify event chain" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Local hash chain verified",
  );
});
test("conflict graph explains duplicate receipt", async ({ page }) => {
  await page.goto("/demo/conflicts");
  await expect(
    page.getByRole("heading", { name: "Evidence conflict graph" }),
  ).toBeVisible();
  await expect(
    page.getByText("SAME RECEIPT NUMBER", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Receipt WB-2002 is also recorded/),
  ).toBeVisible();
});
test("public verification is redacted", async ({ page, request }) => {
  await page.goto("/verify/BP-001");
  await expect(
    page.getByRole("heading", { name: "Local chain matches" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No confirmed anchor" }),
  ).toBeVisible();
  const body = await (await request.get("/api/verify/BP-001")).text();
  expect(body).not.toContain("farmerId");
  expect(body).not.toContain("storagePath");
});
test("integrity lab changes a copy only", async ({ page }) => {
  await page.goto("/demo/lab");
  await page.getByLabel("Replacement quantity (kg)").fill("601");
  await page.getByRole("button", { name: "Run integrity test" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Integrity mismatch at event 1",
  );
});
test("demo role and new batch survive navigation", async ({ page }) => {
  await page.goto("/demo");
  await page.getByLabel("Demo role").selectOption("FARMER");
  await page.getByRole("link", { name: "New batch", exact: true }).click();
  await page.locator('input[name="kg"]').fill("500");
  await page.getByRole("button", { name: "Create draft record" }).click();
  await expect(page.getByRole("status")).toContainText("Created BP-");
  await page.getByRole("link", { name: "All batches", exact: true }).click();
  await expect(page.getByLabel("Demo role")).toHaveValue("FARMER");
  await expect(
    page.getByRole("cell", { name: "DRAFT", exact: true }),
  ).toBeVisible();
});
test("independent actors complete pickup intake and audit", async ({
  page,
}) => {
  await page.goto("/demo/batches/BP-004");
  await page.getByLabel("Demo role").selectOption("COLLECTOR");
  await page.locator('input[name="kg"]').fill("950");
  await page.locator('input[name="time"]').fill("2026-10-24T09:00");
  await page
    .locator('textarea[name="notes"]')
    .fill("Synthetic platform scale measurement at collection.");
  await page
    .getByRole("button", { name: "Confirm pickup", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Recorded in this isolated demo session",
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "pickup.png",
      mimeType: "image/png",
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]),
    });
  await expect(page.getByRole("status")).toContainText(
    "Actual file bytes hashed",
  );
  await page.getByLabel("Demo role").selectOption("PROCESSOR");
  await page.locator('input[name="kg"]').fill("950");
  await page.locator('input[name="time"]').fill("2026-10-24T11:00");
  await page.locator('input[name="receipt"]').fill("NEW-950");
  await page.locator('input[name="facility"]').fill("Demo mill");
  await page
    .locator('textarea[name="notes"]')
    .fill("Independent intake scale confirms wet mass.");
  await page
    .getByRole("button", { name: "Confirm intake", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Recorded in this isolated demo session",
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "intake.png",
      mimeType: "image/png",
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 2]),
    });
  await expect(page.getByRole("status")).toContainText(
    "Actual file bytes hashed",
  );
  await page
    .getByRole("button", { name: "Request audit review", exact: true })
    .click();
  await page.getByLabel("Demo role").selectOption("AUDITOR");
  await page
    .getByLabel("Approve evidence", { exact: true })
    .fill(
      "Reviewed independent custody and both evidence records. SoilSafe remains advisory.",
    );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Approve evidence", exact: true })
    .click();
  await expect(
    page.locator("span.badge").filter({ hasText: "APPROVED" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Verify event chain" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Local hash chain verified",
  );
});
test("private APIs fail closed without a session", async ({ request }) => {
  const response = await request.get(
    "/api/evidence/00000000-0000-0000-0000-000000000000",
  );
  expect([401, 503]).toContain(response.status());
});
