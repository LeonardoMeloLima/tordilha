import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Credenciais e base URL ficam em .env.test (NÃO commitado). Ver tests/PLANO-DE-TESTES.md §8.
dotenv.config({ path: ".env.test" });

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  // Sem paralelismo agressivo: os testes logam contra o Supabase real (read-only),
  // melhor serializar pra não estressar auth nem disparar rate-limit.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  // Sobe o app automaticamente se o E2E_BASE_URL for local. Reaproveita um
  // servidor já rodando (reuseExistingServer) em dev.
  webServer: BASE_URL.includes("localhost")
    ? {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
