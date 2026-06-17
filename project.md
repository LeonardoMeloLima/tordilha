# Pendências do Projeto — Estância Tordilha

Backlog de itens identificados durante brainstorms/specs mas que ficaram fora do escopo da versão atual. Cada item indica a origem (spec ou conversa) para rastreabilidade.

---

## Edição de Agendamento & Aprovações (v2)

Origem: [docs/superpowers/specs/2026-05-17-edicao-agendamento-design.md](docs/superpowers/specs/2026-05-17-edicao-agendamento-design.md)

- [ ] **Push notification (PWA)** — notificar pais quando solicitação for aprovada/rejeitada com app fechado. Hoje só badge in-app + aba "Minhas solicitações".
- [ ] **Sugestão automática de slots livres** — quando pais pede horário ocupado, app sugere alternativas próximas livres em vez de só avisar.
- [ ] **Aprovação automática condicional** — mudanças com ≥ 7 dias de antecedência E sem conflito poderiam aprovar sem ação do gestor (configurável).
- [ ] **Arquivamento de histórico** — solicitações decididas há mais de 90 dias somem da aba "Decididas" do gestor (mantém no banco, esconde da UI).
- [ ] **Limpeza automática de praticantes rejeitados** — após 30 dias, hard-delete ou `arquivado=true`.
- [ ] **Notificar gestor em tempo real** — quando chega nova solicitação, atualizar contador do menu sem precisar recarregar (realtime channel).

### Dívidas técnicas identificadas no code review (2026-05-17)

- [ ] **Edge function `decidir-solicitacao` error mapping** — usa `error.message?.includes("FORBIDDEN")` (substring fragile). Migrar para `error.code` matching os P0001-P0004 que o RPC já define com `USING errcode=`.
- [ ] **`PaisAlunoPerfil` reload pesado** — `window.location.reload()` após cadastro mata toast/route state. Trocar por `refetchVinculos()` + fechar modal.
- [ ] **`bottom-nav` query unbounded** — `useSolicitacoes()` sem filtro carrega todo histórico pra contar "novas decisões". Criar `useSolicitacoesDecididasDesde(lastSeen)` com count-only quando histórico crescer.
- [ ] **Validação 24h em timezone do navegador** — `ModalSugerirHorario.calcularProximaOcorrencia` usa `Date.getDay()` local. Se usuário em TZ não-BRT, pode divergir do server. Aplicar timezone BRT explícito no cálculo client (alinhar com SQL `'America/Sao_Paulo'`).
- [ ] **`PaisAgenda` dois cancel paths** — `handleCancelar` (swipe) deleta, `handleCancelarSessao` (botão) marca como cancelada. Semântica diferente confunde. Unificar: sempre cancelar (preserva histórico).
- [ ] **`GestorPendencias` `impactando: any`** — trocar pra tipo `SolicitacaoRow`.
- [ ] **`useDecidirSolicitacao` invalidação** — comentar que `invalidateQueries({ queryKey: ["solicitacoes"] })` cobre o counter `["solicitacoes", "count", "pendente"]` por prefix match.
- [ ] **`solicitacoes.atualizado_em` sem trigger** — só RPC atualiza manualmente. Adicionar trigger genérico se outros lugares passarem a fazer UPDATE direto.

---

## Rollback de deploys (2026-05-19)

Procedimentos de emergência caso uma versão em produção precise ser revertida. **Cada PR tem seu próprio backup tag** apontando pro SHA do `main` ANTES do merge.

### Tags de backup pushadas

| Tag | SHA do main antes do merge | PR mergeado depois |
|---|---|---|
| `pre-merge-pr1-backup` | `1ad7c14` | PR #1 — gate de aprovação + admin do gestor + saneamento |
| `pre-merge-pr2-backup` | `622edc3` | PR #2 — proteção do último gestor + UX desktop swipe |

### Como reverter o código (Git)

Reverte apenas o ÚLTIMO PR (volta ao estado pré-PR #2, mantém PR #1):
```bash
git push origin pre-merge-pr2-backup:main --force-with-lease
```

Reverte AMBOS os PRs desta sessão (volta ao estado de 2026-05-18, pré-PR #1):
```bash
git push origin pre-merge-pr1-backup:main --force-with-lease
```

Após `--force-with-lease`, a Vercel auto-deploya o estado restaurado em ~1-3 min.

### O que NÃO é revertido pelo Git

Mudanças aplicadas direto no banco via Supabase MCP **não estão em migrations versionadas** e não voltam com `git push`:

**Migrations a reverter manualmente se necessário:**
- `unique_evolucao_per_sessao` (PR #1) — `ALTER TABLE public.evolucao_sessoes DROP CONSTRAINT evolucao_sessoes_sessao_id_unique;`
- `prevent_last_gestor_delete` (PR #2) — `DROP TRIGGER prevent_last_gestor_auth_delete ON auth.users; DROP TRIGGER prevent_last_gestor_role_delete ON public.user_roles; DROP FUNCTION public.prevent_last_gestor_delete();`

**Mudanças destrutivas SEM possibilidade de undo automático:**
- Cleanup do banco (2026-05-19) — todos os usuários, alunos, cavalos, sessões de teste foram APAGADOS. Restore só com backup Supabase (PITR ou dump).
- Conta `thais@gestao.com` criada — pode ser deletada, mas só se houver outro gestor antes (por causa do trigger).
- Daniel duplicado mesclado (PR #1) — dados migrados pra um único registro; não dá pra separar de novo.
- 13 alunos órfãos arquivados (PR #1) — pode ser desarquivado via `UPDATE alunos SET arquivado=false WHERE id IN (...)`. Lista dos IDs no commit `cf5fe41`.

### Procedimento completo de rollback (estado pré-sessão)

Se algo der MUITO errado e precisarmos voltar ao 2026-05-18:

1. **Git**: `git push origin pre-merge-pr1-backup:main --force-with-lease`
2. **DB triggers**: rodar via Supabase SQL Editor
   ```sql
   DROP TRIGGER IF EXISTS prevent_last_gestor_auth_delete ON auth.users;
   DROP TRIGGER IF EXISTS prevent_last_gestor_role_delete ON public.user_roles;
   DROP FUNCTION IF EXISTS public.prevent_last_gestor_delete();
   ALTER TABLE public.evolucao_sessoes DROP CONSTRAINT IF EXISTS evolucao_sessoes_sessao_id_unique;
   ```
3. **Dados**: restore via Point-in-Time Recovery do Supabase (se ativado no plano) pro snapshot de 2026-05-18.

---

## Redesign visual — estimativa de escopo (2026-05-19)

Referência: imagem de app de operadora telefônica enviada pelo Leonardo (gradiente azul→verde, cards com border-radius alto, donut/line charts, ícones em squares arredondados).

**Pré-condições favoráveis no projeto:**
- `recharts` já instalado → não precisa nova lib de chart
- `tailwind.config.ts` existe → tokens centralizáveis
- ~25 componentes shadcn em `components/ui/` já estruturados
- 28 telas distribuídas entre 3 roles (gestor/professor/pais)

**Pré-condições desfavoráveis:**
- Cores hardcoded `#4E593F` em centenas de lugares (não 100% tokenizado)
- `SwipeableCard`/`BottomNav`/`ActionSheet` têm event listeners e lógica complexa — refactor estrutural caro
- Reference não é da mesma vertical (operadora vs equoterapia) — estrutura precisa adaptação

### Estimativa em sprints

| Sprint | Escopo | Horas |
|---|---|---|
| **0. Foundation** | Tokenizar paleta no `tailwind.config.ts`, branch dedicada, rota `/dev/design-preview`, backup tag | 8–12h |
| **1. Componentes base** | Card, Button, Badge, Input, Avatar, ActionSheet (cosmético, sem mexer lógica), ConfirmModal | 16–24h |
| **2. Header + Nav** | ProfileHeader (3 roles, badges role-aware), BottomNav (preservar FAB + event listeners), AguardandoAprovacao | 12–16h |
| **3. Dashboard do Gestor** | Métricas, banner de pendências, próximas sessões | 8–12h |
| **4. Listas** | GestorAlunos, GestorCavalos, GestorAdminPanel, SwipeableCard cosmético, filtros/busca | 16–20h |
| **5. Agenda** | Gestor + Pais + Professor (3 visões), cards de sessão, modal de criação, recorrências | 12–18h |
| **6. Pendências/Solicitações** | GestorPendencias, ProfessorPendencias, PaisSolicitacoes, modais aprovar/rejeitar | 10–14h |
| **7. Perfil do Pais** | PaisAlunoPerfil, PaisMural, PaisCavalos | 8–12h |
| **8. Estatísticas + Charts** | Donut (taxa presença), line (evolução), histórico — usar recharts | 12–18h |
| **9. Auth/Login** | Login, signup multistep do responsável, ResetPassword, FirstAccessPasswordPrompt | 6–8h |
| **10. Estados + A11y** | Loading/empty/error em todas as telas, WCAG contraste, keyboard nav | 8–12h |
| **11. QA + bug bash** | Cross-role, cross-device, performance (lighthouse), buffer de bugs | 8–16h |

**Total bruto:** 124–182h
**+ buffer 30% pra iteração de design + bugs imprevistos:** **160–235h**

### Conversão pra calendário

| Dedicação | Estimativa |
|---|---|
| Full-time (8h/dia útil) | **20–30 dias úteis** ≈ 4–6 semanas |
| Half-time (4h/dia) | **40–60 dias** ≈ 8–12 semanas |
| Side project (2h/dia) | **80–120 dias** ≈ 16–24 semanas (4–6 meses) |

### Estratégia anti-bug

1. **Tokenização primeiro (Sprint 0)** — antes de qualquer JSX, mexer só no `tailwind.config.ts`. Mexer 1 arquivo em vez de 200.
2. **Branch dedicada de redesign** — separada do fluxo normal de features.
3. **Refactor por screen completa** — uma tela 100% redesignada + testada antes da próxima.
4. **Rota `/dev/design-preview`** — mostra cada componente em todas as variantes (loading, empty, error, swipe ativo). Catar regressões antes do merge.
5. **Test plan por screen** — checklist: login → role → ação principal → estado de erro → mobile/desktop.
6. **`SwipeableCard`, `BottomNav` e `ActionSheet` por último** — são os 3 mais arriscados.
7. **Visual regression test (opcional)** — Percy/Chromatic se quiser pagar; senão screenshots manuais.

### Decisões pendentes antes de começar

- [ ] **Manter identidade verde-oliva do equoterapia ou adotar azul-verde da referência?** Equoterapia tem semântica natural/grama; gradiente azul é mais "tech". Pode prejudicar branding.
- [ ] **Dark mode?** Reference é light-only. Implementar dark mode dobra esforço de algumas sprints.
- [ ] **Mobile-first ou responsive desktop?** Hoje é PWA mobile-first; gestor usa em desktop. Reference é mobile.
- [ ] **Charts no Dashboard ou só em Estatísticas?** Reference traz chart bem destacado no home. Hoje só em Estatísticas.

### Riscos específicos a monitorar

- 🔴 Mudar `BottomNav` quebra `fab-click` listeners em 5+ componentes
- 🔴 Refatorar `SwipeableCard` esbarra no fix recém-mergeado do botão hover desktop
- 🟡 Contraste de texto branco sobre gradiente pode falhar WCAG AA
- 🟡 `ProfileHeader` com lógica de role/badge/notificações complexa — alto risco de regressão
- 🟢 Charts em `Estatisticas` — recharts já instalado, troca de styling é direta

---

## Possibilidade futura: terapeuta aprovar a própria proposta de recorrência

**Status:** ideia de produto, NÃO implementada (pode ser que recorramos a ela depois). Registrada em 2026-06-16.

### Contexto
Hoje o fluxo de aprovação é **bilateral cruzado** (RPC `rpc_decidir_solicitacao`, migration `20260517_aprovacao_bilateral.sql`): quem **propõe não aprova** — a contraparte aprova.

- Família (pais) propõe → **terapeuta** aprova
- **Terapeuta (professor) propõe → responsável aprova**
- `novo_cadastro` → gestor aprova

O fix do PR #4 (commit `ed5a204`) corrigiu só a **UI**: o terapeuta deixou de ver o botão "Aprovar" falso na própria proposta (que dava `FORBIDDEN`) e passou a ver "Aguardando aprovação do responsável". **A regra de negócio NÃO mudou.**

### A possibilidade (Opção 3)
Leonardo levantou: *"a família já fez o cadastro; dá pra gente (terapeuta) aprovar aqui mesmo pra facilitar pra família?"*

Ou seja: permitir que o **terapeuta aprove sozinho** as recorrências que ele mesmo propõe, sem depender do responsável confirmar. Motivação: destravar pendências paradas (ex.: a Nara tinha 14 `nova_recorrencia` paradas esperando as famílias).

### Impacto / o que mexer (NÃO é só UI)
- **Banco (RPC `rpc_decidir_solicitacao`):** hoje, se `solicitante_role = 'professor'`, o aprovador exigido é o responsável vinculado (`aluno_responsavel` + `responsaveis.email`). Para a Opção 3, esse guard teria que aceitar o próprio terapeuta (ex.: `v_user_id = alunos.professor_id`).
- **UI (`ProfessorPendencias.tsx`):** reverter/ajustar o `podeDecidir` para voltar a mostrar "Aprovar" nas próprias propostas do terapeuta.

### Trade-off (decisão de produto, não técnica)
- **A favor:** menos fricção; terapeuta resolve sem esperar a família entrar no app.
- **Contra:** **quebra a bilateralidade** — o proponente aprova a si mesmo. A família deixa de confirmar compromissos recorrentes (toda semana, mesmo horário) marcados em nome dela. Perde-se o "handshake" das duas partes.
- **Meio-termo possível:** em vez de o terapeuta aprovar a si mesmo, dar ao **gestor/admin** o poder de destravar manualmente pendências paradas (preserva alguma separação de papéis).

### Riscos
- 🔴 Alterar o RPC `rpc_decidir_solicitacao` afeta TODOS os tipos de solicitação — testar bilateral pais↔terapeuta e novo_cadastro pra não abrir brecha.
- 🟡 Confirmar com a instituição se a família PRECISA mesmo concordar com recorrências (questão clínica/contratual), antes de remover o gate.
