import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/auth",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5174",
    headless: true,
    launchOptions: {
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "https://elite-auth-test.invalid",
      VITE_SUPABASE_ANON_KEY: "test-only-public-key",
    },
  },
});
