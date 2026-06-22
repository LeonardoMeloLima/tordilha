# Plano de Testes: fluxos críticos do PWA Estância Tordilha (E2E)

## 1. Contexto

PWA React + Supabase para gestão de equoterapia (perfis: gestor, terapeuta/professor, responsável/pais). Este plano cobre os fluxos de **maior risco**, priorizando os bugs corrigidos em 2026-06-16/17 (PRs #3 a #6) — são os mais importantes e os que já regrediram silenciosamente uma vez (retornando 200 OK, mas com tela vazia).

Foco: **E2E com Playwright**, autenticando com **usuário de teste dedicado** contra o Supabase real, fazendo apenas **leitura/navegação** (os testes NÃO criam, aprovam ou deletam dados de produção).

## 2. Comportamento esperado

- **Login:** email/senha via Supabase (`signInWithPassword`). Sessão persiste (PWA).
- **Janela anon / rotação de token:** ao voltar do background, o token é renovado antes dos requests; listas (praticantes, sessões, recorrências) NÃO podem zerar para vazio falso (RLS devolve 200 [] para anon).
- **Agenda do terapeuta:** mostra atendimentos recorrentes aprovados (expansão de `sessoes_recorrentes` em sessões virtuais), não só `sessoes` reais.
- **Aprovação bilateral:** terapeuta vê "Aprovar" apenas no que a família propôs; nas próprias propostas vê "Aguardando aprovação do responsável".
- **Timezone:** "Sessões Hoje" / dia da agenda comparados em `America/Sao_Paulo`.
- Dependências externas: Supabase (auth + Postgres + RLS).

## 3. Riscos e prioridade

| Risco (o que pode dar errado) | Impacto | Probabilidade | Prioridade |
|---|---|---|---|
| Lista de praticantes/sessões zera para vazio falso (regressão da janela anon) | Alto | Média | P1 |
| Agenda do terapeuta volta a não mostrar recorrências aprovadas | Alto | Média | P1 |
| Login quebra / sessão não persiste | Alto | Baixa | P1 |
| Terapeuta vê "Aprovar" falso (regressão da regra bilateral na UI) | Médio | Baixa | P2 |
| "Sessões Hoje" / dia da agenda erra por timezone | Médio | Baixa | P2 |
| App não carrega / build quebrado | Alto | Baixa | P1 (smoke) |

## 4. Escopo

**Vai ser testado (E2E):**
- App carrega e renderiza a tela de login (smoke).
- Login com usuário de teste → entra no app e vê seu dashboard/role.
- Persistência de sessão entre reloads (proxy do fix da janela anon: lista não some ao recarregar).
- Terapeuta: a agenda lista os atendimentos do dia (recorrências expandidas aparecem).
- Terapeuta: tela de pendências mostra "Aguardando aprovação" nas propostas próprias (não botão "Aprovar" falso).

**NÃO vai ser testado (e por quê):**
- **Criação/aprovação/exclusão real de dados** — os testes não mutam produção (não há staging). Validamos exibição e navegação, não escrita.
- **Lógica pura de timezone (`dates.ts`) e expansão (`recorrentes.ts`)** — são funções puras; merecem **teste de unidade** (Vitest), não E2E. Listadas como handoff, fora deste plano E2E.
- **RPC `rpc_decidir_solicitacao` / RLS** — lógica de banco; testar via E2E seria frágil e mutaria dados. Já validado manualmente contra o banco.
- **Simular literalmente o background/rotação de token do iOS** — o Playwright não reproduz fielmente a suspensão do PWA pelo SO; usamos **reload** como proxy do "voltar e a lista continuar lá".

## 5. Cenários

| # | Cenário | Classe / limite | Entrada | Saída esperada | Nível | Prioridade |
|---|---------|-----------------|---------|----------------|-------|------------|
| 1 | App sobe e mostra login | smoke | abrir `/` deslogado | redireciona/mostra tela de login (campo email visível) | Sistema | P1 |
| 2 | Login válido (terapeuta de teste) | caminho feliz | email+senha válidos | entra no app, vê nome/role do usuário | Sistema | P1 |
| 3 | Login inválido | caso de erro | email+senha errados | mensagem "Email ou senha incorretos", permanece no login | Sistema | P2 |
| 4 | Sessão persiste em reload | regressão janela anon | logado → F5 | continua logado, listas NÃO ficam vazias | Sistema | P1 |
| 5 | Agenda do terapeuta lista atendimentos do dia | caminho feliz (fix PR #6) | logado terapeuta → agenda → dia com recorrência | aparece ≥1 atendimento (recorrência expandida) | Sistema | P1 |
| 6 | Pendências do terapeuta — sem "Aprovar" falso | regra bilateral (fix PR #4) | terapeuta → pendências → proposta própria | mostra "Aguardando aprovação", NÃO botão "Aprovar" | Sistema | P2 |

## 6. Mapa cenário x nível (handoff para implementação)

- **Sistema/E2E (Playwright):** cenários 1, 2, 3, 4, 5, 6
- **Unidade (Vitest) — fora deste plano, recomendado depois:**
  - `isHojeSP` / `isMesmoDiaSP` / `diaSP` (`src/lib/dates.ts`) — bordas de timezone (sessão 23h UTC, virada de meia-noite SP).
  - `expandRecorrentesForDay` / `mergeDiaSessoes` (`src/lib/recorrentes.ts`) — dedup real vs virtual, dia da semana, ordenação.

## 7. Critérios de aceite (testáveis)

- [ ] **C1:** Ao abrir `/` sem sessão, o campo de email do login está visível em < 5s.
- [ ] **C2:** Após submeter credenciais de teste válidas, o app sai da tela de login (URL ou heading do dashboard muda) em < 10s.
- [ ] **C3:** Com credenciais inválidas, aparece texto de erro contendo "incorretos" e o campo de email continua visível.
- [ ] **C4:** Logado, ao recarregar a página, o usuário continua autenticado (não volta ao login) e a tela principal renderiza conteúdo (não fica em branco/skeleton infinito).
- [ ] **C5:** Logado como terapeuta de teste, ao abrir a agenda e selecionar um dia que tem recorrência ativa, aparece pelo menos 1 item de atendimento na lista do dia.
- [ ] **C6:** Logado como terapeuta de teste, na tela de pendências, uma solicitação criada pelo próprio terapeuta exibe o texto "Aguardando aprovação" e NÃO exibe um botão "Aprovar" clicável.

## 8. Dados de teste necessários

- **Usuário de teste terapeuta** com praticantes vinculados e ao menos 1 recorrência ativa (para os cenários 5 e 6). Credenciais em `.env.test` (NÃO commitado):
  - `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_BASE_URL` (default `http://localhost:5173`).
- Os testes assumem que esse usuário **já existe** e tem dados — não criam nada.
- Preferência: usar a própria conta da terapeuta de teste já em uso (ex.: o perfil que vem sendo validado), OU um usuário criado só para testes pelo gestor no painel Admin.
