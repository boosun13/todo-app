import { defineConfig, devices } from "@playwright/test";

const PORT = 3101;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // 同一 DB を共有するため直列実行
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // 本番ビルドに対して実行する(事前に `npm run build` が必要)
  webServer: {
    command: `pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
