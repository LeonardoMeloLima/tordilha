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
