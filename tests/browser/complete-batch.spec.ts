import { test, expect } from "@playwright/test";

test("farmer creates a batch and all four demo roles complete its custody journey", async ({
  page,
}) => {
  test.setTimeout(90000);
  let batchId = "";
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );

  await test.step("Farmer creates and declares a new batch", async () => {
    await page.goto("/demo");
    await page.getByLabel("Demo role").selectOption("FARMER");
    await page.getByRole("link", { name: "New batch", exact: true }).click();
    await page
      .getByLabel("General origin region")
      .fill("AUTOMATED TEST region");
    await page.getByLabel("Estimated available quantity").fill("1000");
    await page.getByLabel("Mass basis", { exact: true }).selectOption("dry");
    await page.getByLabel("Total generated residue").fill("2000");
    await page.getByRole("button", { name: "Create draft record" }).click();
    await expect(page.getByRole("status")).toContainText("Created BP-");
    batchId = (await page.getByRole("status").innerText()).match(
      /Created (BP-[A-F0-9]+)/,
    )![1];
    await page.getByRole("link", { name: "All batches", exact: true }).click();
    await page
      .getByRole("link", { name: "Open " + batchId, exact: true })
      .click();
    await page.getByRole("button", { name: "Submit declaration" }).click();
    await expect(page.locator(".status-declared")).toBeVisible();
  });

  await test.step("Collector records pickup and attaches evidence", async () => {
    await page.getByLabel("Demo role").selectOption("COLLECTOR");
    await page.locator('input[name="kg"]').fill("1000");
    await page.locator('select[name="basis"]').selectOption("dry");
    await page.locator('input[name="time"]').fill("2026-10-25T09:00");
    await page
      .locator('textarea[name="notes"]')
      .fill("AUTOMATED TEST collector scale measurement.");
    await page
      .getByRole("button", { name: "Confirm pickup", exact: true })
      .click();
    await expect(page.locator(".status-picked_up")).toBeVisible();
    await page
      .locator('input[type="file"]')
      .setInputFiles({
        name: "TEST-pickup.png",
        mimeType: "image/png",
        buffer: png,
      });
    await expect(page.getByRole("status")).toContainText(
      "Actual file bytes hashed",
    );
  });

  await test.step("Processor records intake, uploads evidence and requests review", async () => {
    await page.getByLabel("Demo role").selectOption("PROCESSOR");
    await page.locator('input[name="kg"]').fill("1000");
    await page.locator('select[name="basis"]').selectOption("dry");
    await page.locator('input[name="time"]').fill("2026-10-25T11:00");
    await page
      .locator('input[name="receipt"]')
      .fill("AUTOMATED-TEST-NEW-BATCH");
    await page
      .locator('input[name="facility"]')
      .fill("AUTOMATED TEST facility");
    await page
      .locator('textarea[name="notes"]')
      .fill("AUTOMATED TEST processor measurement.");
    await page
      .getByRole("button", { name: "Confirm intake", exact: true })
      .click();
    await expect(page.locator(".status-received")).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
      name: "TEST-intake.png",
      mimeType: "image/png",
      buffer: Buffer.concat([png, Buffer.from("AUTOMATED TEST intake")]),
    });
    await expect(page.getByRole("status")).toContainText(
      "Actual file bytes hashed",
    );
    await page
      .getByRole("button", { name: "Request audit review", exact: true })
      .click();
    await expect(page.locator(".status-under_review")).toBeVisible();
  });

  await test.step("Auditor documents review, approves and checks the chain", async () => {
    await page.getByLabel("Demo role").selectOption("AUDITOR");
    await page
      .getByLabel("Document agronomic review", { exact: true })
      .fill(
        "AUTOMATED TEST advisory review of proposed removal; practice data only.",
      );
    await page
      .getByRole("button", { name: "Document agronomic review", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Recorded in this isolated demo session",
    );
    await page
      .getByLabel("Approve evidence", { exact: true })
      .fill(
        "AUTOMATED TEST review: both test measurements match and two evidence files are attached.",
      );
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Approve evidence", exact: true })
      .click();
    await expect(page.locator(".status-approved")).toBeVisible();
    await page.getByRole("button", { name: "Verify event chain" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Local hash chain verified",
    );
    await expect(
      page.getByRole("heading", { name: batchId, exact: true }),
    ).toBeVisible();
  });
});
