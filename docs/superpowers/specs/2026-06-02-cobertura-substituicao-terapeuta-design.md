# Cobertura / Substituição de Terapeuta — Design

**Data:** 2026-06-02
**Status:** Aprovado para planejamento

## Problema

Quando uma Terapeuta sai de férias (ou se afasta), outra precisa assumir o atendimento dos praticantes dela. Hoje o vínculo é único e fixo (`alunos.professor_id` aponta para um único terapeuta) e **não existe** nenhum conceito de cobertura, substituição ou transferência. A substituta não consegue ver o praticante, a agenda nem o prontuário.

## Decisões (do brainstorming)

1. **Suporta os dois casos:** cobertura temporária (a titular volta) e transferência definitiva.
2. **Quem comanda:** o gestor/admin define tudo. Terapeutas apenas enxergam o resultado.
3. **Alcance:** praticante a praticante — praticantes diferentes da mesma titular podem ir para substitutos diferentes.
4. **Sessões no período:** aparecem no nome da substituta (B), fiéis a quem atendeu. Ao voltar, as futuras voltam para a titular (A).
5. **Prontuário:** B lê o histórico clínico **completo** enquanto a cobertura está ativa, mas **não edita** os registros antigos da A; cria as evoluções dela próprias.
6. **Fim da cobertura temporária:** **manual** — o gestor encerra quando A voltar. Sem data automática, sem cron. `previsao_volta` é apenas informativa.

## Abordagem escolhida (C — Híbrida)

O dono real (`alunos.professor_id`) **nunca muda** numa cobertura temporária. Uma tabela de cobertura registra quem está cobrindo, e a complexidade de acesso fica concentrada em **um único lugar** (uma função SQL + uma view/RPC) em vez de espalhada pelo código.

Benefícios: titular preservado (auditoria/LGPD limpa), acesso da substituta some na hora ao encerrar (`ativo = false`, sem cron), e o custo de RLS/queries é pago uma vez numa função central, fácil de testar isolada.

## Modelo de dados

### Nova tabela `coberturas`

| coluna | tipo | descrição |
|---|---|---|
| `id` | uuid PK | |
| `aluno_id` | uuid → alunos(id) | qual praticante |
| `substituto_id` | uuid → profiles(id) | quem cobre (B) |
| `titular_id` | uuid → profiles(id) | dono real (A), preservado |
| `tipo` | text | `cobertura` ou `transferencia` |
| `ativo` | boolean | true até o gestor encerrar |
| `previsao_volta` | date (nullable) | apenas informativo, sem efeito no acesso |
| `criada_por` | uuid → auth.users(id) | gestor que criou |
| `criada_em` | timestamptz default now() | |
| `encerrada_por` | uuid → auth.users(id), nullable | quem encerrou |
| `encerrada_em` | timestamptz nullable | quando encerrou |

**Restrição:** índice único parcial garantindo no máximo **uma cobertura ativa por praticante** (`UNIQUE (aluno_id) WHERE ativo = true`).

## Resolução de acesso (ponto único)

### Função `tem_acesso_praticante(aluno_id uuid) returns boolean`

Retorna verdadeiro se:
- `alunos.professor_id = auth.uid()` (titular), **ou**
- existe `coberturas` com `aluno_id` correspondente, `ativo = true` e `substituto_id = auth.uid()`.

`SECURITY DEFINER`, marcada `STABLE`. As políticas RLS de `alunos`, `sessoes` e `evolucao_sessoes` passam a chamar essa função (mantendo as regras existentes de gestor).

### View/RPC `meus_praticantes`

Retorna os praticantes onde o usuário é titular **ou** tem cobertura ativa. O app usa isso no lugar de filtrar `professor_id` na mão.

### Prontuário / LGPD

- **SELECT** de `evolucao_sessoes`/`sessoes`: permitido por `tem_acesso_praticante` → B lê o histórico completo enquanto a cobertura está ativa.
- **UPDATE** de `evolucao_sessoes`: checa **autoria** (não só acesso) → B não altera registros da A; só os próprios.

## Comportamento das sessões

**Ao iniciar a cobertura:**
- Sessões **futuras** (`data_hora >= hoje`, status agendada/confirmada) do praticante passam de A → B (`professor_id = B`).
- Sessões passadas ficam intactas.
- Enquanto ativa, qualquer sessão nova nasce no nome da B.
- A recorrência (`sessoes_recorrentes`) acompanha B no período.

**Ao encerrar a cobertura:**
- Sessões ainda **futuras** voltam B → A.
- Sessões que já ocorreram durante a cobertura **permanecem na B** (fiéis a quem atendeu).
- A recorrência volta para A.

## Transferência definitiva

Mesma criação, com `tipo = 'transferencia'`:
- Move as sessões futuras A → B (igual à cobertura).
- **Efetiva `alunos.professor_id = B` de vez.**
- Marca a cobertura como encerrada na hora (`ativo = false`), ficando como registro histórico da troca.
- Não há volta para A.

## Telas

### Gestor (onde a ação vive)
- Na ficha do praticante (ou aba "Coberturas" no Admin): botão **"Atribuir cobertura/transferência"** → escolhe substituto, tipo e previsão de volta opcional.
- Lista de coberturas ativas com botão **"Encerrar"** (devolve tudo para A).
- Gated por papel `gestor/admin`, como o resto do Admin.

### Terapeutas (só leitura do resultado)
- **Substituta (B):** o praticante aparece na lista/agenda dela enquanto ativa, com selo "Cobertura de [A]".
- **Titular (A):** vê o praticante marcado como "Em cobertura por [B]"; ao voltar, retoma sem ação.

## Fora de escopo (YAGNI)

- Notificação/email (o app não tem fluxo de email).
- Aprovação bilateral da cobertura (é decisão exclusiva do gestor).
- Expiração automática por data / cron.
- Relatórios de cobertura.

## Plano de testes (pontos críticos)

1. `tem_acesso_praticante`: titular vê; substituto ativo vê; substituto encerrado **não** vê; terceiro não vê.
2. Índice único: bloqueia duas coberturas ativas no mesmo praticante.
3. Início move sessões futuras A→B; passadas ficam.
4. Encerrar devolve futuras B→A; mantém as já ocorridas na B.
5. B lê histórico antigo mas **não** edita evolução da A.
6. Transferência efetiva `professor_id` e não reverte.
