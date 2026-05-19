# Edição de Agendamento + Fila de Aprovações — Design

**Data:** 2026-05-17
**Status:** Draft (aguardando revisão do usuário)
**Escopo:** Estância Tordilha PWA — jornadas Gestor e Responsável (Pais)

---

## 1. Problema

Hoje o sistema permite **cadastrar** praticantes e **criar** sessões/recorrências, mas não permite **editar** o dia/hora de um agendamento já existente. Na prática, gestor e responsável precisam **deletar e recriar** — perdendo histórico e sem trilha de auditoria.

Além disso, o cadastro de praticante pelo responsável entra **direto como `ativo`**, sem aprovação do gestor — o que tira o controle de quem realmente entra no sistema.

## 2. Objetivos

1. Permitir **edição de dia/hora** de:
   - Recorrências (aula semanal fixa)
   - Sessões pontuais (aula avulsa)
2. Manter o **gestor como autoridade**: pais propõe, gestor aprova/rejeita.
3. Criar fluxo de **aprovação de novo cadastro** de praticante.
4. Concentrar tudo em uma **caixa única de pendências** do gestor.
5. Dar visibilidade ao responsável do **status das suas solicitações**.

## 3. Decisões já tomadas (brainstorm)

| # | Decisão | Justificativa |
|---|---|---|
| 1 | Editar recorrência **e** sessão pontual | Os dois cenários ocorrem no dia-a-dia |
| 2 | Pais **solicita**, gestor **aprova/rejeita** | Mantém controle do gestor sem fricção de WhatsApp |
| 3 | Caixa unificada de pendências com **tags por tipo** | UX simples: gestor tem um lugar só pra decidir |
| 4 | Mudar recorrência → **cascata** nas sessões `agendada` futuras (preserva `realizada`/`cancelada`) | Pais quer dizer "a partir de agora é nesse dia" |
| 5 | Modal de **preview de impacto** antes de aplicar cascata | Evita decisão cega |
| 6 | **Cancelar** sessão avulsa = direto. **Remarcar** sessão avulsa = aprovação. Mudar **recorrência** = aprovação. | Baixo risco (cancelar) sem burocracia, decisões estruturais com controle |
| 7 | Antecedência mínima: **24h** pro pais. Gestor sem limite. | Padrão de mercado, evita pedido de última hora |
| 8 | Notificação: **A+C** (badge in-app + aba "Minhas solicitações"). **Sem push** na v1. | Cobre o caso real sem complexidade de service worker/infra de push |
| 9 | Motivo de rejeição: **opcional** | Gestor pode justificar ou não, conforme caso |
| 10 | Praticante rejeitado: **soft-keep** (`status='rejeitado'`) | Aparece na aba do pai com motivo; permite refazer cadastro |
| 11 | Modelo de dados: **Opção A** (tabela única `solicitacoes` com JSONB) | Casa com a UX unificada; permite adicionar tipos no futuro |

## 4. Arquitetura

### 4.1 Banco de dados

#### Tabela nova `solicitacoes`

```sql
CREATE TABLE solicitacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            TEXT NOT NULL CHECK (tipo IN (
                    'novo_cadastro',
                    'mudanca_recorrencia',
                    'remarcacao_sessao'
                  )),
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN (
                    'pendente', 'aprovada', 'rejeitada'
                  )),

  solicitante_id  UUID NOT NULL REFERENCES auth.users(id),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  alvo_id         UUID NULL,        -- recorrencia_id ou sessao_id (NULL pra novo_cadastro)

  payload         JSONB NOT NULL,

  motivo_rejeicao TEXT NULL,
  decidido_por    UUID NULL REFERENCES auth.users(id),
  decidido_em     TIMESTAMPTZ NULL,

  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_solicitacoes_status_criado  ON solicitacoes (status, criado_em DESC);
CREATE INDEX idx_solicitacoes_solicitante    ON solicitacoes (solicitante_id);
CREATE INDEX idx_solicitacoes_aluno          ON solicitacoes (aluno_id);

-- Garante apenas uma solicitação pendente por (aluno, tipo, alvo)
CREATE UNIQUE INDEX uniq_solicitacao_pendente
  ON solicitacoes (aluno_id, tipo, COALESCE(alvo_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'pendente';
```

**Estrutura do `payload` por tipo:**

```jsonc
// novo_cadastro
{}  // dados do aluno já vivem na linha de alunos com status='pendente'

// mudanca_recorrencia
{
  "dia_semana_atual": 1,
  "horario_atual": "14:00",
  "dia_semana_novo": 3,
  "horario_novo": "16:00"
}

// remarcacao_sessao
{
  "data_hora_atual": "2026-05-20T14:00:00-03:00",
  "data_hora_nova": "2026-05-22T16:00:00-03:00"
}
```

#### Alteração em `alunos`

```sql
ALTER TABLE alunos ADD COLUMN status TEXT NOT NULL DEFAULT 'ativo'
  CHECK (status IN ('pendente', 'ativo', 'rejeitado'));
```

- Default `ativo` → praticantes existentes não quebram.
- Cadastro pelo pais → `status='pendente'`.
- Cadastro pelo gestor → `status='ativo'`.

#### Trigger de `atualizado_em`

Usar o mesmo padrão das outras tabelas do projeto.

#### RLS

| Tabela | Operação | Quem pode |
|---|---|---|
| `solicitacoes` | SELECT | `gestor`/`admin`: todas. `pais`: só `solicitante_id = auth.uid()`. |
| `solicitacoes` | INSERT | `pais` (insert próprio). `gestor`/`admin` não precisam inserir (editam direto). |
| `solicitacoes` | UPDATE | Apenas `gestor`/`admin` (via edge function). |
| `alunos.status` | UPDATE | Apenas `gestor`/`admin` (via edge function). Resto continua como hoje. |

### 4.2 Edge Function `decidir-solicitacao`

Centraliza aprovação/rejeição porque a cascata de recorrência precisa ser atômica e validações precisam ser revalidadas no momento da decisão.

**Atomicidade:** A edge function (Deno) **chama uma Postgres function via RPC** (`SELECT * FROM rpc_decidir_solicitacao(...)`). Toda a lógica transacional vive na função SQL — a edge function só faz auth, validação de input e tradução de erros.

**Input:**
```ts
{
  solicitacao_id: string;
  decisao: 'aprovar' | 'rejeitar';
  motivo?: string;  // só usado em rejeitar
}
```

**Pré-checks (sempre):**
1. Usuário tem role `gestor` ou `admin`.
2. Solicitação existe e `status='pendente'`.
3. Se aprovar `mudanca_recorrencia` ou `remarcacao_sessao`: revalidar antecedência ≥ 24h **no momento da decisão**. Se passou da janela → erro `STALE_REQUEST` (UI sugere rejeitar manualmente).

**Lógica por tipo (tudo em transação):**

| Tipo | Aprovar | Rejeitar |
|---|---|---|
| `novo_cadastro` | `UPDATE alunos SET status='ativo'` | `UPDATE alunos SET status='rejeitado'` |
| `mudanca_recorrencia` | 1) Update `sessoes_recorrentes` com novo `dia_semana`/`horario`. 2) `DELETE FROM sessoes WHERE recorrente_id=X AND status='agendada' AND data_hora > NOW()`. 3) Regenerar as próximas N sessões no novo horário (ver nota abaixo). | Nada na origem — só fecha a solicitação. |
| `remarcacao_sessao` | `UPDATE sessoes SET data_hora=novo` | Nada na origem. |

**Sempre, no final:**
```sql
UPDATE solicitacoes
SET status='aprovada' | 'rejeitada',
    motivo_rejeicao=$motivo,
    decidido_por=$user,
    decidido_em=NOW(),
    atualizado_em=NOW()
WHERE id=$id;
```

**Códigos de erro:** `FORBIDDEN`, `NOT_FOUND`, `ALREADY_DECIDED`, `STALE_REQUEST`, `SLOT_CONFLICT`.

**Nota sobre regeneração de sessões (`mudanca_recorrencia`):** o plano de implementação deve **investigar como recorrências viram sessões pontuais hoje** (job periódico? trigger? criação manual?). Se já existe uma função de materialização, reusar. Se não, definir a estratégia (ex: materializar as próximas 8 semanas no ato da aprovação). Decisão exata fica no plano, não no spec.

### 4.3 Hooks front

| Hook | Responsabilidade |
|---|---|
| `useSolicitacoes(filters)` | Lista solicitações (status, tipo, escopo gestor/pais derivado do role) |
| `useCriarSolicitacao()` | Insert genérico — recebe `tipo`, `payload`, valida no client (24h, passado) |
| `useDecidirSolicitacao()` | Chama edge function `decidir-solicitacao` |
| `useUpdateRecorrente()` | **Novo** — gestor editar direto (sem solicitação) |
| `useSessoes().updateSessao()` | **Já existe** — só plugar UI |

### 4.4 Componentes UI

**Novos:**
- `src/components/pais/PaisSolicitacoes.tsx` — aba "Minhas solicitações"
- `src/components/gestor/GestorPendencias.tsx` — caixa unificada
- `src/components/shared/ModalSugerirHorario.tsx` — pais sugere novo horário
- `src/components/shared/ModalImpactoMudanca.tsx` — preview cascata
- `src/components/gestor/ModalRejeitarSolicitacao.tsx` — motivo opcional

**Alterados:**
- `PaisAlunoPerfil.tsx` — cadastro vira `status=pendente` + cria solicitação
- `PaisAgenda.tsx` — botões "Sugerir novo horário" e "Remarcar"
- `GestorAgenda.tsx` — botão "Editar" recorrência → modal de impacto
- `GestorAlunos.tsx` — badge `Pendente`/`Rejeitado`
- Menu lateral do Gestor — item "Pendências" com contador
- Menu lateral do Pais — item "Minhas solicitações" com badge

## 5. Fluxos detalhados

### 5.1 — Responsável cadastra praticante

1. Preenche formulário → submit.
2. Insert `alunos` com `status='pendente'`.
3. Insert `solicitacoes` com `tipo='novo_cadastro'`, `aluno_id`, `solicitante_id=auth.uid()`, `payload={}`.
4. Toast: **"Cadastro enviado! Aguardando aprovação do gestor."**
5. Praticante aparece na lista do pai com badge amarelo **"Pendente"** — não permite agendar sessão.

### 5.2 — Responsável sugere mudança de recorrência

1. Em `PaisAgenda.tsx`, card da recorrência → botão **"Sugerir novo horário"**.
2. Modal com `dia_semana` + `horario`.
3. Validações client:
   - ❌ Horário no passado.
   - ❌ Primeira ocorrência do novo horário tem que ser ≥ 24h a partir de agora.
   - ⚠️ Aviso (não bloqueia) se slot ocupado.
4. Submit → `useCriarSolicitacao({ tipo: 'mudanca_recorrencia', aluno_id, alvo_id: recorrencia_id, payload: {...} })`.
5. Toast: "Sua solicitação foi enviada para o gestor."
6. Card ganha badge **"Mudança pendente"** — bloqueia nova solicitação até decidir.

### 5.3 — Responsável cancela ou remarca sessão pontual

- **Cancelar** → direto. `UPDATE sessoes SET status='cancelada'`. Sem solicitação. Gestor vê o evento na agenda.
- **Remarcar** → modal com `data_hora`. Validações iguais (24h, passado). Cria `solicitacao tipo='remarcacao_sessao'`.

### 5.4 — Aba "Minhas solicitações" (pais)

Item de menu novo. Lista paginada com filtros `Pendentes` / `Aprovadas` / `Rejeitadas` / `Todas`. Cada item mostra tag, status, descrição da proposta, e (quando rejeitada) o motivo.

Badge na entrada (bolinha vermelha + contador) quando há solicitações com `decidido_em > último_acesso_local` (timestamp em `localStorage`).

### 5.5 — Caixa de pendências (gestor)

Item de menu novo: **"Pendências"** com contador `WHERE status='pendente'`.

Lista ordenada por `criado_em DESC`. Cada item tem tag colorida por tipo + filtros topo `[Tudo] [Cadastros] [Mudanças de horário] [Remarcações]`. Botões `[Ver detalhes] [Aprovar] [Rejeitar]`.

Aba secundária **"Decididas"** — últimos 90 dias.

### 5.6 — Gestor edita direto

- Recorrência → botão "Editar" → modal `dia_semana`+`horario` → **modal de impacto** → confirmar → aplica.
- Sessão pontual → botão "Remarcar" → modal `data_hora` → confirmar.
- Praticante → CRUD direto (já existe).

Validações: só "não pode passado" + aviso (não bloqueia) de slot ocupado.

### 5.7 — Modal de impacto (mudança de recorrência)

Mostra: nome do praticante, "De: X → Para: Y", lista das sessões `agendada` futuras que serão canceladas, lista das novas que serão criadas, aviso "Sessões realizadas/canceladas não são afetadas". Botões `[Cancelar] [Confirmar mudança]`.

### 5.8 — Aprovação / rejeição (gestor)

- **Aprovar** → se recorrência, abre modal de impacto antes; senão confirma direto. Chama `decidir-solicitacao` com `decisao='aprovar'`.
- **Rejeitar** → modal pequeno com campo opcional `motivo_rejeicao` (placeholder: *"Ex: horário sem instrutor disponível..."*). Chama `decidir-solicitacao` com `decisao='rejeitar', motivo`.

Após: item some, contador atualiza, toast confirma.

## 6. Edge cases

| Caso | Tratamento |
|---|---|
| Pais pede mudança, gestor demora, janela 24h passou | Edge function retorna `STALE_REQUEST`. UI mostra erro e sugere "Solicitação expirou — rejeitar e pedir refazer". |
| Pais pede 2x seguidas no mesmo item | Unique index bloqueia. UI já desabilita botão se há pendente. |
| Slot foi ocupado entre solicitação e decisão | Edge function detecta `SLOT_CONFLICT` → erro → gestor rejeita manualmente. |
| Praticante `pendente` tenta agendar sessão | UI esconde botão "Agendar". Backend valida no insert de `sessoes` (check `alunos.status='ativo'`). |
| Cadastro rejeitado, pais quer refazer | Cria **nova linha** em `alunos` + **nova solicitação**. Não reaproveita a rejeitada. |
| Gestor edita recorrência direto enquanto há solicitação pendente do pais pra essa mesma recorrência | Ao salvar, sistema detecta pendência → pergunta "Há uma solicitação pendente nessa recorrência. Aplicar sua edição cancela aquela solicitação. Continuar?" |

## 7. Migração

```sql
-- 1. Adiciona status em alunos
ALTER TABLE alunos ADD COLUMN status TEXT NOT NULL DEFAULT 'ativo'
  CHECK (status IN ('pendente', 'ativo', 'rejeitado'));

-- 2. Cria solicitacoes (DDL acima)

-- 3. RLS policies (DDL completo na implementação)

-- 4. Trigger de atualizado_em (mesmo padrão das outras tabelas do projeto)

-- 5. Postgres function rpc_decidir_solicitacao(solicitacao_id, decisao, motivo, user_id)
--    encapsula a lógica transacional da Seção 4.2
```

Risco zero pra dados existentes: todos os alunos viram `ativo`.

## 8. Fora do escopo (registrado em `project.md`)

- Push notification (PWA)
- Sugestão automática de slots livres
- Aprovação automática condicional (mudanças com ≥ 7 dias de antecedência)
- Arquivamento de histórico > 90 dias
- Limpeza automática de praticantes rejeitados
- Realtime no contador de pendências

## 9. Regra de negócio em linguagem natural (para o cliente)

> **Como funciona a edição de horários e o cadastro de praticantes:**
>
> **Cadastro de novo praticante:**
> Quando o responsável cadastra um novo praticante no app, o cadastro fica **aguardando aprovação do gestor**. O gestor recebe esse pedido na sua caixa de **Pendências** e pode aprovar ou rejeitar (com motivo opcional). Enquanto não for aprovado, o praticante aparece para o responsável marcado como "Pendente" e não pode ter sessões agendadas. Se rejeitado, o responsável vê o motivo e pode fazer um novo cadastro.
>
> **Mudança de horário fixo (aula semanal):**
> O responsável pode pedir para mudar o dia e horário fixo das aulas do filho. A solicitação é enviada para o gestor aprovar. **Toda solicitação precisa ter pelo menos 24 horas de antecedência.** Quando o gestor aprova, todas as aulas futuras já marcadas no horário antigo são automaticamente canceladas e novas aulas são criadas no horário novo. Aulas já realizadas no passado não são afetadas. O gestor sempre vê um resumo do impacto antes de confirmar.
>
> **Remarcar uma aula específica (avulsa):**
> O responsável pode pedir para remarcar uma aula específica para outro dia ou horário. Também precisa de 24h de antecedência e passa pela aprovação do gestor.
>
> **Cancelar uma aula específica:**
> O responsável pode cancelar uma aula avulsa **direto, sem precisar de aprovação** — afinal, está apenas liberando o horário. O gestor é notificado mas não precisa decidir nada.
>
> **Quando o gestor edita:**
> O gestor pode editar qualquer horário (recorrência ou avulsa) **diretamente, sem fila de aprovação** — ele é a autoridade da agenda. Quando muda uma recorrência, o sistema também mostra a ele o resumo do impacto antes de aplicar.
>
> **Como o responsável fica sabendo:**
> Toda solicitação enviada aparece na aba **"Minhas solicitações"** com o status (Pendente, Aprovada, Rejeitada). Quando o gestor decide, o ícone da aba mostra uma notificação na próxima vez que o responsável abrir o app.
>
> **Histórico:**
> O gestor tem uma aba **"Decididas"** com as solicitações já aprovadas/rejeitadas dos últimos 90 dias para consultar quando precisar.
