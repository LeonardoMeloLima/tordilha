# Como funciona o Dashboard do Gestor

> Documento explicativo sobre a tela inicial do gestor (Estancia Tordilha PWA).

---

## A tela em resumo

Quando o gestor entra no app, a tela inicial mostra:

1. **Saudação personalizada** (ex.: "Olá, Taís — GESTOR")
2. **Bloco "Estatísticas"** com 4 cartões de indicadores
3. **Bloco "Próximas Sessões"** com as sessões agendadas para hoje

Vamos detalhar cada parte.

---

## Os 4 indicadores (cartões coloridos)

### 🟣 Praticantes Ativos
- **O que mostra:** o número total de alunos cadastrados e ativos no sistema.
- **Como é calculado:** conta todos os praticantes que estão marcados como ativos.
- **Atualização:** em tempo real — sempre que um aluno é cadastrado, removido ou desativado, o número muda.

### 🟢 Sessões Hoje
- **O que mostra:** quantas sessões estão marcadas para o dia atual.
- **Como é calculado:** soma as sessões avulsas + as sessões recorrentes (que se repetem semanalmente) que caem hoje.
- **Atualização:** em tempo real — atualiza quando o gestor cria, cancela ou marca uma sessão como concluída.

### 🔵 Taxa de Presença
- **O que mostra:** o percentual de aproveitamento real das sessões — quantas o praticante compareceu de fato, considerando todo o histórico desde o início.
- **Como é calculado:**
  - Conta todas as sessões marcadas como **concluída** (praticante esteve presente)
  - Conta todas as sessões marcadas como **falta** (praticante não compareceu)
  - Calcula: `(concluídas ÷ (concluídas + faltas)) × 100`
  - Sessões **canceladas** ou ainda **agendadas** ficam de fora — só entram no cálculo as que tiveram resultado real.
- **Atualização:** em tempo real — sempre que uma sessão é marcada como concluída ou falta, o número é recalculado.
- **Quando clicar (drill-down disponível):** abre uma janela com:
  - O percentual em destaque
  - Quantas sessões foram realizadas e quantas no total
  - Os 5 dias com mais faltas
  - Ranking dos terapeutas (top 5 com mais sessões), mostrando a taxa de presença individual de cada um
  - As últimas 5 faltas registradas (com data, praticante e terapeuta)

### 🟫 Cavalos Ativos
- **O que mostra:** quantos cavalos estão ativos sobre o total cadastrado (formato `X/Y`).
- **Como é calculado:** conta os cavalos com status "Ativo" e divide pelo total cadastrado.
- **Atualização:** em tempo real — quando um cavalo é cadastrado ou tem o status alterado, o número muda.

---

## Comportamento ao clicar nos cartões

**Hoje:**

- **Taxa de Presença** → abre uma janela de detalhamento próprio (já implementada)
- **Praticantes Ativos**, **Sessões Hoje**, **Cavalos Ativos** → ainda levam à tela geral de Estatísticas

**Planejado (próximas entregas):** os 3 cartões restantes ganharão detalhamento próprio:

- **Praticantes Ativos** → lista dos alunos com filtros
- **Sessões Hoje** → lista das sessões do dia, mostrando concluídas e faltas
- **Cavalos Ativos** → uso de cada cavalo (quantas sessões foi montado, % de utilização) para identificar cavalos sub ou super utilizados

---

## Bloco "Próximas Sessões"

Logo abaixo dos cartões, mostra **até 5 próximas sessões** agendadas para hoje, ordenadas pelo horário.

Cada sessão mostra:
- Foto e nome do praticante
- Nome do cavalo a ser usado
- Diagnóstico ou tipo de avaliação

O botão **"Ver todas"** leva à tela completa de Agenda.

---

## O que precisa ser ajustado / desenvolvido

| Item | Status atual | Próximo passo |
|---|---|---|
| Praticantes Ativos | ✅ Real e funcional | Adicionar drill-down (lista com filtros) |
| Sessões Hoje | ✅ Real e funcional | Adicionar drill-down (concluídas vs. faltas) |
| Taxa de Presença | ✅ Real e funcional, **com drill-down** | — |
| Cavalos Ativos | ✅ Real e funcional | Adicionar drill-down (uso por cavalo) |

---

*Documento gerado em 27/04/2026.*
