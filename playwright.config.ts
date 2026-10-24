import { defineConfig, devices } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT || "3000";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: { baseURL: `http://127.0.0.1:${port}`, trace: "retain-on-failure" },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_PORT,
    timeout: 120000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
