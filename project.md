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
