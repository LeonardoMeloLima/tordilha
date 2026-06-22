import { Page, expect } from "@playwright/test";

export const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "";
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "";

export function hasTestCreds(): boolean {
  return !!TEST_EMAIL && !!TEST_PASSWORD;
}

// Seletores estáveis da tela de login (ver src/pages/Login.tsx).
export function emailInput(page: Page) {
  return page.locator('input[type="email"]');
}
export function passwordInput(page: Page) {
  return page.locator('input[type="password"]').first();
}
export function submitButton(page: Page) {
  return page.getByRole("button", { name: /entrar/i });
}

/**
 * Faz login com as credenciais de teste e espera sair da tela de login.
 * Pré-condição: hasTestCreds() === true (senão o teste deve ser skipado).
 */
export async function login(page: Page) {
  await page.goto("/");
  await emailInput(page).waitFor({ state: "visible" });
  await emailInput(page).fill(TEST_EMAIL);
  await passwordInput(page).fill(TEST_PASSWORD);
  await submitButton(page).click();
  // Saiu do login quando o campo de email some (entrou no app).
  await expect(emailInput(page)).toBeHidden({ timeout: 15_000 });
}
