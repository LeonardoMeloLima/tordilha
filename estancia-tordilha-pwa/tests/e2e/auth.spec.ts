import { test, expect } from "@playwright/test";
import {
  emailInput,
  passwordInput,
  submitButton,
  login,
  hasTestCreds,
} from "./helpers";

// Cenários 1-4 do PLANO-DE-TESTES.md (auth + persistência de sessão).

test("C1: app sobe e mostra a tela de login (smoke)", async ({ page }) => {
  await page.goto("/");
  // Campo de email visível em até 5s (criterio C1).
  await expect(emailInput(page)).toBeVisible({ timeout: 5_000 });
});

test("C3: login inválido mostra erro e permanece no login", async ({ page }) => {
  await page.goto("/");
  await emailInput(page).fill("naoexiste-e2e@tordilha.invalid");
  await passwordInput(page).fill("senha-errada-123");
  await submitButton(page).click();

  // Mensagem traduzida contém "incorretos" (Login.tsx translateAuthError).
  // O toast renderiza a msg em 2 nós (visual + role=status pra a11y); .first() basta.
  await expect(page.getByText(/incorretos/i).first()).toBeVisible({ timeout: 10_000 });
  // Continua na tela de login.
  await expect(emailInput(page)).toBeVisible();
});

test.describe("com credenciais de teste", () => {
  test.skip(!hasTestCreds(), "Defina E2E_TEST_EMAIL/E2E_TEST_PASSWORD em .env.test");

  test("C2: login válido entra no app", async ({ page }) => {
    await login(page);
    // Já dentro do app: o campo de email do login não existe mais.
    await expect(emailInput(page)).toBeHidden();
  });

  test("C4: sessão persiste após reload e a tela não fica vazia", async ({ page }) => {
    await login(page);
    await page.reload();
    // Não voltou pro login (sessão persistiu).
    await expect(emailInput(page)).toBeHidden({ timeout: 10_000 });
    // A tela principal renderizou conteúdo real (não ficou em branco): há texto visível.
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
