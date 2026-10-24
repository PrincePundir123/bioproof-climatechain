import { test, expect } from "@playwright/test";

test("public navigation, photo loading and attribution", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  const hero = page.getByRole("img", {
    name: "Straw bales in a harvested wheat field under a cloudy sky",
  });
  await expect(hero).toBeVisible();
  await expect
    .poll(() =>
      hero.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    )
    .toBe(true);
  if (isMobile) {
    const menu = page.getByRole("button", { name: "Menu" });
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeFocused();
    await menu.click();
  }
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Our purpose" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Photography credits" }),
  ).toBeVisible();
  await expect(
    page.locator("#photo-credits a[href*='pexels.com/photo/']"),
  ).toHaveCount(5);
});

test("search empty state and readable creation labels", async ({ page }) => {
  await page.goto("/demo");
  await page.getByLabel("Search batches").fill("no-such-batch");
  await expect(
    page.getByText("No batches match this view.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Demo role").selectOption("FARMER");
  await page.getByRole("link", { name: "New batch", exact: true }).click();
  await expect(page.getByLabel("Registered plot")).toBeVisible();
  await expect(
    page.getByLabel("Estimated available quantity (kg)"),
  ).toBeVisible();
  await expect(page.getByLabel("Mass basis", { exact: true })).toBeVisible();
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`screens fit the viewport at ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/login",
      "/methodology",
      "/about",
      "/demo",
      "/demo/review",
      "/demo/conflicts",
      "/demo/lab",
      "/demo/analytics",
      "/demo/batches/BP-001",
      "/verify/BP-001",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      const excess = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(excess, `${route} horizontal overflow`).toBeLessThanOrEqual(1);
    }
    expect(errors).toEqual([]);
  });
}
