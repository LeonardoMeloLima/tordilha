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

## Realidade do RLS (descoberta durante o planejamento)

O spec original assumiu que o acesso era controlado por RLS por terapeuta. **Não é.** No banco real:

- `alunos`: leitura **aberta** a qualquer autenticado (`SELECT USING (true)`); gestor tem `FOR ALL`. Não há policy de escrita por professor — só o gestor gerencia alunos.
- `sessoes`: leitura **aberta** a qualquer autenticado; gestor `FOR ALL`; pais com insert/delete escopados por e-mail.
- O recorte "meus praticantes" é feito **na UI** (`alunos.filter(a => a.professor_id === userId)`), não no banco.
- O único ponto onde um terapeuta de fato **escreve** dado clínico é a evolução (`evolucao_sessoes`), que é amarrada à **sessão**.

## Abordagem escolhida (C — ajustada à realidade)

O dono real (`alunos.professor_id`) **nunca muda** numa cobertura temporária. Uma tabela de cobertura registra quem está cobrindo. O acesso da substituta é resolvido assim:

1. **Ver praticante e agenda:** mudança no **filtro da UI** — "meus praticantes" passa a ser "sou titular **OU** tenho cobertura ativa". Como a leitura no banco já é aberta, não há reescrita de RLS de leitura.
2. **Registrar evolução:** as sessões futuras do período passam a ter `sessoes.professor_id = B` (ver "Comportamento das sessões"). Como a evolução é presa à sessão, a substituta já consegue registrá-la pela sessão repassada. Só ajustamos a policy de `evolucao_sessoes` **se** ela hoje bloquear (ver Tarefa 0 do plano).

Benefícios: titular preservado (auditoria/LGPD limpa), acesso da substituta some na hora ao encerrar (`ativo = false`, sem cron), e o trabalho fica concentrado em tabela + RPCs + filtro de UI, sem reescrever RLS amplo.

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

## Resolução de acesso

### Merge no cliente via tabela `coberturas`

Como a leitura de `alunos` e `coberturas` é aberta a autenticados, a resolução "titular OU cobertura ativa" é feita **no cliente** (sem view, YAGNI): um hook lê as coberturas ativas e o componente une com `alunos`.

O filtro de caseload no app deixa de ser `alunos.filter(a => a.professor_id === userId)` e passa a ser "sou titular (`professor_id === userId`) **OU** existe cobertura ativa com `substituto_id === userId` para aquele aluno". O mesmo dado alimenta os selos "Cobertura de [A]" (lado substituto) e "Em cobertura por [B]" (lado titular).

### Prontuário / LGPD

- **Leitura** do histórico (`evolucao_sessoes`, `sessoes`): já liberada no banco; a substituta enxerga o histórico completo do praticante enquanto a cobertura está ativa (gate é a UI, que passa a listar o praticante coberto).
- **Escrita** de evolução: a substituta registra evolução nas sessões do período (que têm `professor_id = B`). Ela **não edita** registros antigos da A — o UPDATE de `evolucao_sessoes` deve checar autoria/sessão própria, não só acesso (Tarefa 0 confirma a policy atual).

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

1. Resolução de caseload (no cliente): titular vê; substituto com cobertura ativa vê; substituto após encerrar **não** vê; terceiro não vê.
2. Índice único: bloqueia duas coberturas ativas no mesmo praticante.
3. Início move sessões futuras A→B; passadas ficam.
4. Encerrar devolve futuras B→A; mantém as já ocorridas na B.
5. B lê histórico antigo mas **não** edita evolução da A.
6. Transferência efetiva `professor_id` e não reverte.
