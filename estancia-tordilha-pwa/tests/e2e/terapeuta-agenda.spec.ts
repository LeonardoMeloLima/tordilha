import { test, expect } from "@playwright/test";
import { login, hasTestCreds } from "./helpers";

// Cenários 5 e 6 do PLANO-DE-TESTES.md (terapeuta).
// Requer usuário de teste TERAPEUTA com ao menos 1 recorrência ativa.
// A aba default do professor é "agenda" (Index.tsx defaultTabs), então ao
// logar ele já cai na ProfessorAgenda — não precisamos navegar por ícone.

test.describe("agenda do terapeuta", () => {
  test.skip(!hasTestCreds(), "Defina E2E_TEST_EMAIL/E2E_TEST_PASSWORD (terapeuta) em .env.test");

  test("C5: agenda lista atendimentos do dia (recorrências expandidas aparecem)", async ({ page }) => {
    await login(page);

    // Confirma que está na agenda do terapeuta (aba default).
    await expect(page.getByRole("heading", { name: /minha agenda/i })).toBeVisible({
      timeout: 15_000,
    });

    // A view tem o toggle "Recorrências dos meus praticantes" / "Sessões do dia".
    // Garante que a seção de recorrências mostra ao menos 1 (fix PR #6: o
    // terapeuta voltou a ver os atendimentos recorrentes aprovados).
    // O botão "Recorrência (N)" só mostra contagem quando N > 0.
    const recorrenciaToggle = page.getByText(/recorrência\s*\(\d+\)/i);
    await expect(recorrenciaToggle).toBeVisible({ timeout: 15_000 });

    // Abre a view de recorrências e confirma que NÃO está vazia
    // ("NENHUMA RECORRÊNCIA CADASTRADA" era o sintoma do bug).
    await recorrenciaToggle.click();
    await expect(page.getByText(/nenhuma recorrência cadastrada/i)).toBeHidden();
  });

  test("C6: pendências não mostram 'Aprovar' falso na proposta própria do terapeuta", async ({
    page,
  }) => {
    // A aba Pendências não tem label acessível no BottomNav (só ícone), então
    // navegamos pela rota interna via evento da própria app não é trivial.
    // Marcamos como fixme até adicionarmos aria-label aos botões de navegação
    // (ver recomendação no resumo). O critério C6 fica documentado.
    test.fixme(
      true,
      "Requer aria-label nos botões do BottomNav para navegar até Pendências de forma estável"
    );
  });
});
