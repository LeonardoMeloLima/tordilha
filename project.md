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
