import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 3,
  reporter: "list",
  use: { trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      testMatch: "catalog.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4173" },
    },
    {
      name: "mobile",
      testMatch: "catalog.spec.ts",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        baseURL: "http://127.0.0.1:4173",
      },
    },
  ],
  webServer: [
    {
      command:
        "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
    },
  ],
});
