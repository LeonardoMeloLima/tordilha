# Edição de Agendamento + Fila de Aprovações — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que gestor edite (direto) e responsável proponha (com aprovação) mudanças de dia/hora de recorrências e sessões pontuais; adicionar fluxo de aprovação para cadastro de novo praticante; consolidar tudo numa caixa unificada de pendências do gestor.

**Architecture:** Tabela única `solicitacoes` (polimórfica com JSONB) + função Postgres `rpc_decidir_solicitacao` (transacional) chamada por edge function `decidir-solicitacao`. UI separa jornadas Gestor e Pais, com componentes compartilhados (`ModalSugerirHorario`, `ModalImpactoMudanca`).

**Tech Stack:** React 19 + Vite + TypeScript, Supabase (Postgres + Edge Functions Deno), TanStack Query v5, shadcn/ui (Radix), Sonner, react-hook-form + zod.

**Spec base:** [`docs/superpowers/specs/2026-05-17-edicao-agendamento-design.md`](../specs/2026-05-17-edicao-agendamento-design.md)

> **Sobre testes:** Este projeto não tem infraestrutura de testes automatizados (sem Vitest/Jest configurado). Cada task inclui passos de **verificação manual** explícitos. Setup de testes automatizados está registrado como item v2 em `project.md`.

> **Sobre o working directory:** Todos os caminhos de código são relativos a `/Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa/`.

---

## Fase 1 — Banco de dados

### Task 1: Migration `alunos.status`

**Files:**
- Create: `supabase/migrations/20260517_aluno_status.sql`

- [ ] **Step 1: Criar arquivo da migration**

```sql
-- supabase/migrations/20260517_aluno_status.sql
ALTER TABLE alunos ADD COLUMN status TEXT NOT NULL DEFAULT 'ativo'
  CHECK (status IN ('pendente', 'ativo', 'rejeitado'));

CREATE INDEX idx_alunos_status ON alunos (status) WHERE status != 'ativo';

COMMENT ON COLUMN alunos.status IS
  'Estado do cadastro: pendente (aguardando aprovação do gestor), ativo (operacional), rejeitado (gestor recusou)';
```

- [ ] **Step 2: Aplicar via Supabase MCP**

Usar a ferramenta MCP `mcp__supabase__apply_migration` com `name='aluno_status'` e o SQL acima.

- [ ] **Step 3: Verificar via `mcp__supabase__list_tables`**

Confirmar que `alunos.status` aparece com default `'ativo'` e check constraint. Confirmar que todos os alunos existentes têm `status='ativo'`:

```sql
SELECT count(*) FROM alunos WHERE status IS NULL;  -- esperado: 0
SELECT count(*) FROM alunos WHERE status = 'ativo';  -- esperado: total de alunos
```

Use `mcp__supabase__execute_sql` pra rodar.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260517_aluno_status.sql
git commit -m "feat(db): add alunos.status column (pendente|ativo|rejeitado)"
```

---

### Task 2: Migration `solicitacoes` + RLS

**Files:**
- Create: `supabase/migrations/20260517_solicitacoes.sql`

- [ ] **Step 1: Criar arquivo da migration**

```sql
-- supabase/migrations/20260517_solicitacoes.sql
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
  alvo_id         UUID NULL,

  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,

  motivo_rejeicao TEXT NULL,
  decidido_por    UUID NULL REFERENCES auth.users(id),
  decidido_em     TIMESTAMPTZ NULL,

  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_solicitacoes_status_criado ON solicitacoes (status, criado_em DESC);
CREATE INDEX idx_solicitacoes_solicitante   ON solicitacoes (solicitante_id);
CREATE INDEX idx_solicitacoes_aluno         ON solicitacoes (aluno_id);

-- Uma única solicitação pendente por (aluno, tipo, alvo)
CREATE UNIQUE INDEX uniq_solicitacao_pendente
  ON solicitacoes (aluno_id, tipo, COALESCE(alvo_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'pendente';

-- RLS
ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;

-- Gestor/admin lê tudo
CREATE POLICY "solicitacoes_gestor_read"
  ON solicitacoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

-- Pais lê só as próprias
CREATE POLICY "solicitacoes_pais_read_own"
  ON solicitacoes FOR SELECT
  USING (solicitante_id = auth.uid());

-- Pais insere as próprias
CREATE POLICY "solicitacoes_pais_insert_own"
  ON solicitacoes FOR INSERT
  WITH CHECK (
    solicitante_id = auth.uid()
    AND status = 'pendente'
    AND decidido_por IS NULL
  );

-- Apenas gestor/admin pode atualizar (decidir)
CREATE POLICY "solicitacoes_gestor_update"
  ON solicitacoes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

COMMENT ON TABLE solicitacoes IS
  'Fila unificada de pendências: novo cadastro de praticante, mudança de recorrência, remarcação de sessão pontual';
```

- [ ] **Step 2: Aplicar via MCP**

Usar `mcp__supabase__apply_migration` com `name='solicitacoes'` e o SQL.

- [ ] **Step 3: Verificar**

```sql
SELECT count(*) FROM solicitacoes;  -- esperado: 0
SELECT policyname FROM pg_policies WHERE tablename = 'solicitacoes';
-- esperado: 4 policies (gestor_read, pais_read_own, pais_insert_own, gestor_update)
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260517_solicitacoes.sql
git commit -m "feat(db): create solicitacoes table with RLS"
```

---

### Task 3: Migration `rpc_decidir_solicitacao`

**Files:**
- Create: `supabase/migrations/20260517_rpc_decidir_solicitacao.sql`

- [ ] **Step 1: Criar arquivo da migration**

```sql
-- supabase/migrations/20260517_rpc_decidir_solicitacao.sql
CREATE OR REPLACE FUNCTION rpc_decidir_solicitacao(
  p_solicitacao_id UUID,
  p_decisao TEXT,
  p_motivo TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sol           solicitacoes%ROWTYPE;
  v_user_id       UUID := auth.uid();
  v_user_role     TEXT;
  v_novo_dia      INT;
  v_novo_horario  TIME;
  v_nova_dh       TIMESTAMPTZ;
  v_atualizadas   INT := 0;
  v_canceladas    INT := 0;
BEGIN
  -- 1. Auth
  SELECT role INTO v_user_role FROM user_roles WHERE user_id = v_user_id LIMIT 1;
  IF v_user_role IS NULL OR v_user_role NOT IN ('gestor', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN' USING errcode = 'P0001';
  END IF;

  IF p_decisao NOT IN ('aprovar', 'rejeitar') THEN
    RAISE EXCEPTION 'INVALID_DECISION' USING errcode = 'P0001';
  END IF;

  -- 2. Lock e carrega
  SELECT * INTO v_sol FROM solicitacoes WHERE id = p_solicitacao_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND' USING errcode = 'P0002';
  END IF;
  IF v_sol.status <> 'pendente' THEN
    RAISE EXCEPTION 'ALREADY_DECIDED' USING errcode = 'P0003';
  END IF;

  -- 3. Rejeitar
  IF p_decisao = 'rejeitar' THEN
    IF v_sol.tipo = 'novo_cadastro' THEN
      UPDATE alunos SET status = 'rejeitado' WHERE id = v_sol.aluno_id;
    END IF;
    UPDATE solicitacoes
       SET status = 'rejeitada',
           motivo_rejeicao = p_motivo,
           decidido_por = v_user_id,
           decidido_em = NOW(),
           atualizado_em = NOW()
     WHERE id = p_solicitacao_id;
    RETURN jsonb_build_object('ok', true, 'decisao', 'rejeitar');
  END IF;

  -- 4. Aprovar — switch por tipo
  IF v_sol.tipo = 'novo_cadastro' THEN
    UPDATE alunos SET status = 'ativo' WHERE id = v_sol.aluno_id;

  ELSIF v_sol.tipo = 'mudanca_recorrencia' THEN
    v_novo_dia := (v_sol.payload->>'dia_semana_novo')::INT;
    v_novo_horario := (v_sol.payload->>'horario_novo')::TIME;

    -- Atualiza a regra
    UPDATE sessoes_recorrentes
       SET dia_semana = v_novo_dia,
           horario = v_novo_horario,
           atualizado_em = NOW()
     WHERE id = v_sol.alvo_id;

    -- Move/cancela sessões agendadas futuras vinculadas
    WITH affected AS (
      SELECT id,
             (
               (data_hora AT TIME ZONE 'America/Sao_Paulo')::date
               - EXTRACT(DOW FROM data_hora AT TIME ZONE 'America/Sao_Paulo')::int
               + v_novo_dia
             )::date + v_novo_horario AS nova_local
      FROM sessoes
      WHERE recorrente_id = v_sol.alvo_id
        AND status = 'agendada'
        AND data_hora > NOW()
    ),
    cancel AS (
      UPDATE sessoes s SET status = 'cancelada'
        FROM affected a
       WHERE s.id = a.id
         AND (a.nova_local AT TIME ZONE 'America/Sao_Paulo') <= NOW()
      RETURNING s.id
    ),
    upd AS (
      UPDATE sessoes s SET data_hora = (a.nova_local AT TIME ZONE 'America/Sao_Paulo')
        FROM affected a
       WHERE s.id = a.id
         AND (a.nova_local AT TIME ZONE 'America/Sao_Paulo') > NOW()
      RETURNING s.id
    )
    SELECT (SELECT count(*) FROM upd), (SELECT count(*) FROM cancel)
      INTO v_atualizadas, v_canceladas;

  ELSIF v_sol.tipo = 'remarcacao_sessao' THEN
    v_nova_dh := (v_sol.payload->>'data_hora_nova')::TIMESTAMPTZ;
    IF v_nova_dh <= NOW() THEN
      RAISE EXCEPTION 'STALE_REQUEST' USING errcode = 'P0004';
    END IF;
    UPDATE sessoes SET data_hora = v_nova_dh WHERE id = v_sol.alvo_id;
  END IF;

  -- 5. Fecha solicitação
  UPDATE solicitacoes
     SET status = 'aprovada',
         decidido_por = v_user_id,
         decidido_em = NOW(),
         atualizado_em = NOW()
   WHERE id = p_solicitacao_id;

  RETURN jsonb_build_object(
    'ok', true,
    'decisao', 'aprovar',
    'sessoes_atualizadas', v_atualizadas,
    'sessoes_canceladas', v_canceladas
  );
END;
$$;

-- Permitir chamada via PostgREST/RPC apenas para authenticated
REVOKE ALL ON FUNCTION rpc_decidir_solicitacao(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_decidir_solicitacao(UUID, TEXT, TEXT) TO authenticated;
```

- [ ] **Step 2: Aplicar via MCP**

`mcp__supabase__apply_migration` com `name='rpc_decidir_solicitacao'`.

- [ ] **Step 3: Smoke test manual via SQL**

Criar um aluno de teste com `status='pendente'` + uma solicitação `novo_cadastro` no SQL editor (impersonating um pais por enquanto manualmente). Depois chamar como gestor:

```sql
SELECT rpc_decidir_solicitacao('<solicitacao_id>'::uuid, 'aprovar', NULL);
SELECT status FROM alunos WHERE id = '<aluno_id>';  -- esperado: 'ativo'
SELECT status, decidido_por, decidido_em FROM solicitacoes WHERE id = '<solicitacao_id>';
```

Usar `mcp__supabase__execute_sql`. Limpar depois (`DELETE`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260517_rpc_decidir_solicitacao.sql
git commit -m "feat(db): add rpc_decidir_solicitacao function with transactional cascade"
```

---

## Fase 2 — Edge Function

### Task 4: Edge function `decidir-solicitacao`

**Files:**
- Create: `supabase/functions/decidir-solicitacao/index.ts`

- [ ] **Step 1: Criar arquivo seguindo o padrão de `create-user`**

```typescript
// supabase/functions/decidir-solicitacao/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DecidirInput {
  solicitacao_id: string;
  decisao: "aprovar" | "rejeitar";
  motivo?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client com o JWT do usuário (a RPC roda como o usuário, RLS aplica)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const body: DecidirInput = await req.json();

    if (!body.solicitacao_id || !["aprovar", "rejeitar"].includes(body.decisao)) {
      return new Response(JSON.stringify({ error: "INVALID_INPUT" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.rpc("rpc_decidir_solicitacao", {
      p_solicitacao_id: body.solicitacao_id,
      p_decisao: body.decisao,
      p_motivo: body.motivo ?? null,
    });

    if (error) {
      const code = error.message?.includes("FORBIDDEN") ? 403
        : error.message?.includes("NOT_FOUND") ? 404
        : error.message?.includes("ALREADY_DECIDED") ? 409
        : error.message?.includes("STALE_REQUEST") ? 410
        : 400;
      return new Response(
        JSON.stringify({ error: error.message, code: error.code }),
        { status: code, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Deploy via MCP**

Usar `mcp__supabase__deploy_edge_function` com:
- `name='decidir-solicitacao'`
- `files=[{ name: 'index.ts', content: <conteúdo acima> }]`

- [ ] **Step 3: Verificar deploy**

`mcp__supabase__list_edge_functions` — confirmar que aparece `decidir-solicitacao` com `status='ACTIVE'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/decidir-solicitacao/
git commit -m "feat(edge): decidir-solicitacao function calling RPC"
```

---

## Fase 3 — Types e Hooks

### Task 5: Regenerar types do Supabase

**Files:**
- Modify: `src/types/database.types.ts`

- [ ] **Step 1: Gerar types**

Usar `mcp__supabase__generate_typescript_types`. Substituir o conteúdo do arquivo pelo retornado.

- [ ] **Step 2: Verificar build TypeScript**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
npx tsc --noEmit
```

Esperado: zero erros. (Pode haver warnings — só erros bloqueiam.)

- [ ] **Step 3: Commit**

```bash
git add src/types/database.types.ts
git commit -m "chore(types): regenerate after solicitacoes + alunos.status"
```

---

### Task 6: Hook `useSolicitacoes`

**Files:**
- Create: `src/hooks/useSolicitacoes.ts`

- [ ] **Step 1: Criar hook**

```typescript
// src/hooks/useSolicitacoes.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SolicitacaoStatus = "pendente" | "aprovada" | "rejeitada";
export type SolicitacaoTipo = "novo_cadastro" | "mudanca_recorrencia" | "remarcacao_sessao";

export interface SolicitacaoRow {
  id: string;
  tipo: SolicitacaoTipo;
  status: SolicitacaoStatus;
  solicitante_id: string;
  aluno_id: string;
  alvo_id: string | null;
  payload: Record<string, unknown>;
  motivo_rejeicao: string | null;
  decidido_por: string | null;
  decidido_em: string | null;
  criado_em: string;
  atualizado_em: string;
  aluno?: { nome: string; status: string } | null;
}

interface UseSolicitacoesArgs {
  status?: SolicitacaoStatus | "todas";
  tipo?: SolicitacaoTipo | "todos";
}

export function useSolicitacoes(args: UseSolicitacoesArgs = {}) {
  return useQuery({
    queryKey: ["solicitacoes", args.status ?? "todas", args.tipo ?? "todos"],
    queryFn: async () => {
      let q = supabase
        .from("solicitacoes")
        .select("*, aluno:alunos(nome, status)")
        .order("criado_em", { ascending: false });
      if (args.status && args.status !== "todas") q = q.eq("status", args.status);
      if (args.tipo && args.tipo !== "todos") q = q.eq("tipo", args.tipo);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SolicitacaoRow[];
    },
  });
}

export function useSolicitacoesPendentesCount() {
  return useQuery({
    queryKey: ["solicitacoes", "count", "pendente"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("solicitacoes")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSolicitacoes.ts
git commit -m "feat(hooks): useSolicitacoes + useSolicitacoesPendentesCount"
```

---

### Task 7: Hook `useCriarSolicitacao`

**Files:**
- Create: `src/hooks/useCriarSolicitacao.ts`

- [ ] **Step 1: Criar hook**

```typescript
// src/hooks/useCriarSolicitacao.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SolicitacaoTipo } from "./useSolicitacoes";

interface CriarArgs {
  tipo: SolicitacaoTipo;
  aluno_id: string;
  alvo_id?: string | null;
  payload: Record<string, unknown>;
}

export function useCriarSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: CriarArgs) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("UNAUTHENTICATED");

      const { data, error } = await supabase
        .from("solicitacoes")
        .insert({
          tipo: args.tipo,
          aluno_id: args.aluno_id,
          alvo_id: args.alvo_id ?? null,
          payload: args.payload,
          solicitante_id: userData.user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("DUPLICATE_PENDING");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
    },
  });
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCriarSolicitacao.ts
git commit -m "feat(hooks): useCriarSolicitacao"
```

---

### Task 8: Hook `useDecidirSolicitacao`

**Files:**
- Create: `src/hooks/useDecidirSolicitacao.ts`

- [ ] **Step 1: Criar hook**

```typescript
// src/hooks/useDecidirSolicitacao.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DecidirArgs {
  solicitacao_id: string;
  decisao: "aprovar" | "rejeitar";
  motivo?: string;
}

interface DecidirResult {
  ok: boolean;
  decisao: "aprovar" | "rejeitar";
  sessoes_atualizadas?: number;
  sessoes_canceladas?: number;
}

export function useDecidirSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: DecidirArgs): Promise<DecidirResult> => {
      const { data, error } = await supabase.functions.invoke("decidir-solicitacao", {
        body: args,
      });
      if (error) throw error;
      return data as DecidirResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      qc.invalidateQueries({ queryKey: ["sessoes"] });
      qc.invalidateQueries({ queryKey: ["sessoes_recorrentes"] });
      qc.invalidateQueries({ queryKey: ["alunos"] });
    },
  });
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDecidirSolicitacao.ts
git commit -m "feat(hooks): useDecidirSolicitacao (chama edge function)"
```

---

### Task 9: Migration `rpc_atualizar_recorrencia` (para edição direta do gestor)

> Esta RPC é usada na Task 19 para o gestor editar recorrência diretamente (sem passar por solicitação). Aplica a mesma cascata do `rpc_decidir_solicitacao` mas sem tocar em `solicitacoes`. Também invalida qualquer solicitação pendente da mesma recorrência (edge case da Seção 6 do spec).

**Files:**
- Create: `supabase/migrations/20260517_rpc_atualizar_recorrencia.sql`

- [ ] **Step 1: Criar arquivo da migration**

```sql
-- supabase/migrations/20260517_rpc_atualizar_recorrencia.sql
CREATE OR REPLACE FUNCTION rpc_atualizar_recorrencia(
  p_recorrencia_id UUID,
  p_dia_semana INT,
  p_horario TIME
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_atualizadas INT := 0;
  v_canceladas INT := 0;
BEGIN
  SELECT role INTO v_user_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
  IF v_user_role IS NULL OR v_user_role NOT IN ('gestor', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN' USING errcode = 'P0001';
  END IF;

  UPDATE sessoes_recorrentes
     SET dia_semana = p_dia_semana, horario = p_horario, atualizado_em = NOW()
   WHERE id = p_recorrencia_id;

  WITH affected AS (
    SELECT id,
           ((data_hora AT TIME ZONE 'America/Sao_Paulo')::date
             - EXTRACT(DOW FROM data_hora AT TIME ZONE 'America/Sao_Paulo')::int
             + p_dia_semana)::date + p_horario AS nova_local
    FROM sessoes
    WHERE recorrente_id = p_recorrencia_id
      AND status = 'agendada'
      AND data_hora > NOW()
  ),
  cancel AS (
    UPDATE sessoes s SET status = 'cancelada' FROM affected a
     WHERE s.id = a.id AND (a.nova_local AT TIME ZONE 'America/Sao_Paulo') <= NOW()
    RETURNING s.id
  ),
  upd AS (
    UPDATE sessoes s SET data_hora = (a.nova_local AT TIME ZONE 'America/Sao_Paulo')
      FROM affected a
     WHERE s.id = a.id AND (a.nova_local AT TIME ZONE 'America/Sao_Paulo') > NOW()
    RETURNING s.id
  )
  SELECT (SELECT count(*) FROM upd), (SELECT count(*) FROM cancel)
    INTO v_atualizadas, v_canceladas;

  -- Invalida solicitações pendentes da mesma recorrência (edge case spec §6)
  UPDATE solicitacoes
     SET status = 'rejeitada',
         motivo_rejeicao = 'Gestor aplicou alteração direta',
         decidido_por = auth.uid(),
         decidido_em = NOW(),
         atualizado_em = NOW()
   WHERE alvo_id = p_recorrencia_id
     AND tipo = 'mudanca_recorrencia'
     AND status = 'pendente';

  RETURN jsonb_build_object(
    'ok', true,
    'sessoes_atualizadas', v_atualizadas,
    'sessoes_canceladas', v_canceladas
  );
END;
$$;

REVOKE ALL ON FUNCTION rpc_atualizar_recorrencia(UUID, INT, TIME) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_atualizar_recorrencia(UUID, INT, TIME) TO authenticated;
```

- [ ] **Step 2: Aplicar via MCP**

Usar `mcp__supabase__apply_migration` com `name='rpc_atualizar_recorrencia'`.

- [ ] **Step 3: Verificar**

```sql
SELECT proname FROM pg_proc WHERE proname = 'rpc_atualizar_recorrencia';  -- esperado: 1 linha
```

Use `mcp__supabase__execute_sql`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260517_rpc_atualizar_recorrencia.sql
git commit -m "feat(db): rpc_atualizar_recorrencia (gestor edita direto + invalida pendências)"
```

---

## Fase 4 — UI Pais

### Task 10: Cadastro de praticante vira "pendente" + cria solicitação

**Files:**
- Modify: `src/components/pais/PaisAlunoPerfil.tsx:204-275`

- [ ] **Step 1: Ler bloco `handleRegisterStudent`**

```bash
sed -n '204,275p' src/components/pais/PaisAlunoPerfil.tsx
```

- [ ] **Step 2: Modificar insert para `status: 'pendente'` e criar solicitação no mesmo fluxo**

Substituir o trecho onde faz `ativo: true,` por `ativo: true, status: 'pendente',` no insert do aluno. Depois do insert ter sucesso, antes do toast/redirect, adicionar:

```typescript
// Cria solicitação de aprovação do cadastro
const { error: solErr } = await supabase
  .from("solicitacoes")
  .insert({
    tipo: "novo_cadastro",
    aluno_id: novoAluno.id,
    solicitante_id: userId,
    payload: {},
  });
if (solErr) {
  console.error("Falha ao criar solicitação:", solErr);
  toast.warning("Cadastro salvo mas não criou solicitação. Avise o gestor.");
}
```

Substituir o toast final de sucesso por:
```typescript
toast.success("Cadastro enviado! Aguardando aprovação do gestor.");
```

- [ ] **Step 3: Verificar TypeScript + build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 4: Smoke test manual**

Rodar `npm run dev`. Logar como responsável. Cadastrar um praticante novo. Verificar via MCP:

```sql
SELECT id, nome, status FROM alunos ORDER BY criado_em DESC LIMIT 1;
SELECT id, tipo, status, aluno_id FROM solicitacoes ORDER BY criado_em DESC LIMIT 1;
```

Esperado: aluno `status='pendente'` + solicitação `tipo='novo_cadastro' status='pendente'`.

- [ ] **Step 5: Commit**

```bash
git add src/components/pais/PaisAlunoPerfil.tsx
git commit -m "feat(pais): cadastro vira pendente + cria solicitação de aprovação"
```

---

### Task 11: Badge "Pendente"/"Rejeitado" nos cards de praticantes do pais

**Files:**
- Modify: `src/components/pais/PaisAlunoPerfil.tsx` (lista de praticantes)
- Possivelmente: `src/components/pais/PaisAgenda.tsx` (se exibe lista de filhos)

- [ ] **Step 1: Identificar onde a lista de praticantes do pais é renderizada**

```bash
grep -rn "alunos.map\|alunos\.length" src/components/pais/
```

- [ ] **Step 2: Adicionar badge condicional ao lado do nome**

Para cada card/item de praticante, adicionar:

```tsx
{aluno.status === "pendente" && (
  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
    Pendente
  </Badge>
)}
{aluno.status === "rejeitado" && (
  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
    Rejeitado
  </Badge>
)}
```

Importar `Badge` de `@/components/ui/badge` se ainda não estiver importado.

- [ ] **Step 3: Esconder/desabilitar botões de "Agendar sessão" quando `status !== 'ativo'`**

Onde houver o botão de criar sessão para o aluno, envolver com:
```tsx
{aluno.status === "ativo" && (
  <Button>Agendar sessão</Button>
)}
```

- [ ] **Step 4: Smoke test**

`npm run dev`. Logar como pais que tem praticante pendente. Verificar:
- Badge amarelo "Pendente" aparece
- Botão de agendar sessão não aparece pro pendente

- [ ] **Step 5: Commit**

```bash
git add src/components/pais/
git commit -m "feat(pais): badge Pendente/Rejeitado + bloqueia agendamento se não ativo"
```

---

### Task 12: Modal `ModalSugerirHorario` (compartilhado)

**Files:**
- Create: `src/components/shared/ModalSugerirHorario.tsx`

- [ ] **Step 1: Criar modal genérico**

```tsx
// src/components/shared/ModalSugerirHorario.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const schemaRecorrencia = z.object({
  dia_semana: z.coerce.number().int().min(0).max(6),
  horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM"),
});

const schemaSessao = z.object({
  data_hora: z.string().min(1, "Selecione data e hora"),
});

export type SugerirRecorrenciaData = z.infer<typeof schemaRecorrencia>;
export type SugerirSessaoData = z.infer<typeof schemaSessao>;

interface PropsRecorrencia {
  open: boolean;
  onClose: () => void;
  modo: "recorrencia";
  atual: { dia_semana: number; horario: string };
  onSubmit: (data: SugerirRecorrenciaData) => Promise<void>;
}
interface PropsSessao {
  open: boolean;
  onClose: () => void;
  modo: "sessao";
  atual: { data_hora: string };
  onSubmit: (data: SugerirSessaoData) => Promise<void>;
}

export function ModalSugerirHorario(props: PropsRecorrencia | PropsSessao) {
  if (props.modo === "recorrencia") {
    return <RecorrenciaForm {...props} />;
  }
  return <SessaoForm {...props} />;
}

function RecorrenciaForm({ open, onClose, atual, onSubmit }: PropsRecorrencia) {
  const form = useForm<SugerirRecorrenciaData>({
    resolver: zodResolver(schemaRecorrencia),
    defaultValues: { dia_semana: atual.dia_semana, horario: atual.horario },
  });

  const submit = form.handleSubmit(async (data) => {
    // Validar antecedência ≥ 24h
    const proximaOcorrencia = calcularProximaOcorrencia(data.dia_semana, data.horario);
    const diff = proximaOcorrencia.getTime() - Date.now();
    if (diff < 24 * 60 * 60 * 1000) {
      form.setError("horario", { message: "Mínimo 24h de antecedência." });
      return;
    }
    await onSubmit(data);
    onClose();
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sugerir novo horário fixo</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Atual</Label>
            <div className="text-sm text-muted-foreground">
              {DIAS[atual.dia_semana]} às {atual.horario}
            </div>
          </div>
          <div>
            <Label>Novo dia da semana</Label>
            <Select
              value={String(form.watch("dia_semana"))}
              onValueChange={(v) => form.setValue("dia_semana", Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIAS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Novo horário (HH:MM)</Label>
            <Input type="time" {...form.register("horario")} />
            {form.formState.errors.horario && (
              <p className="text-sm text-red-600">{form.formState.errors.horario.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>Enviar solicitação</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SessaoForm({ open, onClose, atual, onSubmit }: PropsSessao) {
  const form = useForm<SugerirSessaoData>({
    resolver: zodResolver(schemaSessao),
    defaultValues: { data_hora: atual.data_hora.slice(0, 16) },
  });

  const submit = form.handleSubmit(async (data) => {
    const novaData = new Date(data.data_hora);
    const diff = novaData.getTime() - Date.now();
    if (diff < 24 * 60 * 60 * 1000) {
      form.setError("data_hora", { message: "Mínimo 24h de antecedência." });
      return;
    }
    await onSubmit(data);
    onClose();
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remarcar sessão</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Atual</Label>
            <div className="text-sm text-muted-foreground">
              {new Date(atual.data_hora).toLocaleString("pt-BR")}
            </div>
          </div>
          <div>
            <Label>Nova data e hora</Label>
            <Input type="datetime-local" {...form.register("data_hora")} />
            {form.formState.errors.data_hora && (
              <p className="text-sm text-red-600">{form.formState.errors.data_hora.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>Enviar solicitação</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function calcularProximaOcorrencia(dia: number, horario: string): Date {
  const [hh, mm] = horario.split(":").map(Number);
  const agora = new Date();
  const diaAtual = agora.getDay();
  let diasAteOcorrencia = (dia - diaAtual + 7) % 7;
  const candidata = new Date(agora);
  candidata.setDate(agora.getDate() + diasAteOcorrencia);
  candidata.setHours(hh, mm, 0, 0);
  if (candidata.getTime() <= agora.getTime()) {
    candidata.setDate(candidata.getDate() + 7);
  }
  return candidata;
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ModalSugerirHorario.tsx
git commit -m "feat(shared): ModalSugerirHorario com validação de 24h"
```

---

### Task 13: Botões na `PaisAgenda` — Sugerir/Remarcar/Cancelar

**Files:**
- Modify: `src/components/pais/PaisAgenda.tsx`

- [ ] **Step 1: Ler arquivo pra entender estrutura dos cards**

```bash
cat src/components/pais/PaisAgenda.tsx | head -150
```

- [ ] **Step 2: Adicionar estado de modal + integração + set de pendências**

No topo do componente:

```typescript
import { ModalSugerirHorario } from "@/components/shared/ModalSugerirHorario";
import { useCriarSolicitacao } from "@/hooks/useCriarSolicitacao";
import { useSolicitacoes } from "@/hooks/useSolicitacoes";
import { useSessoes } from "@/hooks/useSessoes";
import { toast } from "sonner";
import { useMemo, useState } from "react";

const [sugerirRec, setSugerirRec] = useState<{ open: boolean; recorrencia?: any }>({ open: false });
const [sugerirSes, setSugerirSes] = useState<{ open: boolean; sessao?: any }>({ open: false });
const criarSol = useCriarSolicitacao();
const { updateSessao } = useSessoes(/* args já em uso */);

// Sets pra lookup O(1) de alvos com solicitação pendente
const { data: pendentes } = useSolicitacoes({ status: "pendente" });
const recorrenciasPendentes = useMemo(
  () => new Set((pendentes ?? []).filter(s => s.tipo === "mudanca_recorrencia").map(s => s.alvo_id)),
  [pendentes]
);
const sessoesPendentes = useMemo(
  () => new Set((pendentes ?? []).filter(s => s.tipo === "remarcacao_sessao").map(s => s.alvo_id)),
  [pendentes]
);

const handleCancelarSessao = async (id: string) => {
  if (!confirm("Cancelar esta sessão?")) return;
  try {
    await updateSessao.mutateAsync({ id, status: "cancelada" });
    toast.success("Sessão cancelada");
  } catch (e: any) {
    toast.error(e.message ?? "Erro ao cancelar");
  }
};
```

- [ ] **Step 3: Adicionar botões nos cards de recorrência**

No render de cada recorrência, junto dos outros botões:

```tsx
{(() => {
  const pendente = recorrenciasPendentes.has(recorrencia.id);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pendente}
      onClick={() => setSugerirRec({ open: true, recorrencia })}
    >
      {pendente ? "Mudança pendente" : "Sugerir novo horário"}
    </Button>
  );
})()}
```

- [ ] **Step 4: Adicionar botões "Cancelar" e "Remarcar" nos cards de sessão pontual**

```tsx
<Button size="sm" variant="ghost" onClick={() => handleCancelarSessao(sessao.id)}>
  Cancelar
</Button>
{(() => {
  const pendente = sessoesPendentes.has(sessao.id);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pendente}
      onClick={() => setSugerirSes({ open: true, sessao })}
    >
      {pendente ? "Remarcação pendente" : "Remarcar"}
    </Button>
  );
})()}
```

- [ ] **Step 5: Renderizar os modais no final do return**

```tsx
{sugerirRec.open && sugerirRec.recorrencia && (
  <ModalSugerirHorario
    open
    onClose={() => setSugerirRec({ open: false })}
    modo="recorrencia"
    atual={{
      dia_semana: sugerirRec.recorrencia.dia_semana,
      horario: sugerirRec.recorrencia.horario,
    }}
    onSubmit={async (data) => {
      try {
        await criarSol.mutateAsync({
          tipo: "mudanca_recorrencia",
          aluno_id: sugerirRec.recorrencia.aluno_id,
          alvo_id: sugerirRec.recorrencia.id,
          payload: {
            dia_semana_atual: sugerirRec.recorrencia.dia_semana,
            horario_atual: sugerirRec.recorrencia.horario,
            dia_semana_novo: data.dia_semana,
            horario_novo: data.horario,
          },
        });
        toast.success("Sua solicitação foi enviada para o gestor.");
      } catch (e: any) {
        if (e.message === "DUPLICATE_PENDING") {
          toast.error("Já existe uma solicitação pendente nesse horário.");
        } else {
          toast.error("Erro ao enviar solicitação.");
        }
      }
    }}
  />
)}
{sugerirSes.open && sugerirSes.sessao && (
  <ModalSugerirHorario
    open
    onClose={() => setSugerirSes({ open: false })}
    modo="sessao"
    atual={{ data_hora: sugerirSes.sessao.data_hora }}
    onSubmit={async (data) => {
      try {
        await criarSol.mutateAsync({
          tipo: "remarcacao_sessao",
          aluno_id: sugerirSes.sessao.aluno_id,
          alvo_id: sugerirSes.sessao.id,
          payload: {
            data_hora_atual: sugerirSes.sessao.data_hora,
            data_hora_nova: new Date(data.data_hora).toISOString(),
          },
        });
        toast.success("Sua solicitação foi enviada para o gestor.");
      } catch (e: any) {
        toast.error(e.message === "DUPLICATE_PENDING"
          ? "Já existe uma solicitação pendente."
          : "Erro ao enviar solicitação.");
      }
    }}
  />
)}
```

- [ ] **Step 6: Smoke test**

`npm run dev`. Como pais:
1. Clica "Sugerir novo horário" em recorrência → modal abre → escolhe novo dia/hora → envia → toast de sucesso
2. Verifica via MCP: `SELECT * FROM solicitacoes ORDER BY criado_em DESC LIMIT 1;` — tipo correto, payload correto
3. Tenta criar 2x — segunda vez bloqueia com "Já existe pendente"
4. Cancelar sessão — confirma que `sessoes.status='cancelada'`

- [ ] **Step 7: Commit**

```bash
git add src/components/pais/PaisAgenda.tsx
git commit -m "feat(pais): sugerir novo horário + remarcar + cancelar sessão"
```

---

### Task 14: Página `PaisSolicitacoes`

**Files:**
- Create: `src/components/pais/PaisSolicitacoes.tsx`
- Modify: `src/App.tsx` (adicionar rota)

- [ ] **Step 1: Criar componente da página**

```tsx
// src/components/pais/PaisSolicitacoes.tsx
import { useState } from "react";
import { useSolicitacoes, type SolicitacaoStatus } from "@/hooks/useSolicitacoes";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TIPO_LABEL: Record<string, string> = {
  novo_cadastro: "Novo cadastro",
  mudanca_recorrencia: "Mudança de horário",
  remarcacao_sessao: "Remarcação avulsa",
};

const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  aprovada: "bg-green-100 text-green-800",
  rejeitada: "bg-red-100 text-red-800",
};

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function PaisSolicitacoes() {
  const [filter, setFilter] = useState<SolicitacaoStatus | "todas">("todas");
  const { data: solicitacoes, isLoading } = useSolicitacoes({ status: filter });

  if (isLoading) return <div className="p-4">Carregando...</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Minhas solicitações</h1>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="aprovada">Aprovadas</TabsTrigger>
          <TabsTrigger value="rejeitada">Rejeitadas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {(solicitacoes ?? []).length === 0 && (
          <p className="text-muted-foreground">Nenhuma solicitação.</p>
        )}
        {(solicitacoes ?? []).map((s) => (
          <Card key={s.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{TIPO_LABEL[s.tipo]}</Badge>
              <Badge className={STATUS_COLOR[s.status]}>{s.status.toUpperCase()}</Badge>
            </div>
            <div className="font-medium">{s.aluno?.nome ?? "—"}</div>
            <SolicitacaoDescricao tipo={s.tipo} payload={s.payload} />
            {s.status === "rejeitada" && s.motivo_rejeicao && (
              <p className="text-sm text-red-700 mt-2">
                <strong>Motivo:</strong> {s.motivo_rejeicao}
              </p>
            )}
            <div className="text-xs text-muted-foreground">
              {new Date(s.criado_em).toLocaleString("pt-BR")}
              {s.decidido_em && ` • decidido em ${new Date(s.decidido_em).toLocaleString("pt-BR")}`}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SolicitacaoDescricao({ tipo, payload }: { tipo: string; payload: any }) {
  if (tipo === "mudanca_recorrencia") {
    return (
      <div className="text-sm">
        De: <strong>{DIAS[payload.dia_semana_atual]} {payload.horario_atual}</strong>
        {" → "}
        Para: <strong>{DIAS[payload.dia_semana_novo]} {payload.horario_novo}</strong>
      </div>
    );
  }
  if (tipo === "remarcacao_sessao") {
    return (
      <div className="text-sm">
        De: <strong>{new Date(payload.data_hora_atual).toLocaleString("pt-BR")}</strong>
        {" → "}
        Para: <strong>{new Date(payload.data_hora_nova).toLocaleString("pt-BR")}</strong>
      </div>
    );
  }
  return <div className="text-sm text-muted-foreground">Cadastro de novo praticante</div>;
}
```

- [ ] **Step 2: Adicionar rota em `src/App.tsx`**

Procurar onde estão as outras rotas do pais e adicionar:

```tsx
<Route path="/pais/solicitacoes" element={<PaisSolicitacoes />} />
```

Importar no topo.

- [ ] **Step 3: Smoke test**

`npm run dev`. Logar como pais. Acessar `/pais/solicitacoes` direto. Verificar:
- Lista renderiza
- Filtros funcionam
- Solicitação pendente aparece corretamente
- Após gestor aprovar/rejeitar (próxima fase), badge muda

- [ ] **Step 4: Commit**

```bash
git add src/components/pais/PaisSolicitacoes.tsx src/App.tsx
git commit -m "feat(pais): página Minhas solicitações"
```

---

### Task 15: Bottom nav role-aware + badge de novidades

**Files:**
- Modify: `src/components/layout/bottom-nav.tsx`

- [ ] **Step 1: Ler arquivo + RoleContext**

```bash
cat src/components/layout/bottom-nav.tsx
cat src/contexts/RoleContext.tsx
```

- [ ] **Step 2: Refatorar para itens condicionais por role**

Estrutura proposta:
```tsx
import { useRole } from "@/contexts/RoleContext";
import { useSolicitacoes, useSolicitacoesPendentesCount } from "@/hooks/useSolicitacoes";
import { useEffect, useState } from "react";

// ... dentro do componente:
const { role } = useRole();

// Pais: badge se houver decisões novas (decidido_em > último_acesso)
const { data: solicitacoes } = useSolicitacoes();
const [ultimoAcesso, setUltimoAcesso] = useState<string>(() =>
  localStorage.getItem("pais_solicitacoes_last_seen") ?? "1970-01-01"
);
const novasDecisoes = role === "pais"
  ? (solicitacoes ?? []).filter(s => s.decidido_em && s.decidido_em > ultimoAcesso).length
  : 0;

// Gestor: contador de pendentes
const { data: pendentesCount } = useSolicitacoesPendentesCount();
```

Itens condicionais:
```tsx
{role === "pais" && (
  <NavItem
    to="/pais/solicitacoes"
    icon={Inbox}
    label="Solicitações"
    badge={novasDecisoes > 0 ? novasDecisoes : undefined}
    onClick={() => {
      const now = new Date().toISOString();
      localStorage.setItem("pais_solicitacoes_last_seen", now);
      setUltimoAcesso(now);
    }}
  />
)}

{(role === "gestor" || role === "admin") && (
  <NavItem
    to="/gestor/pendencias"
    icon={Bell}
    label="Pendências"
    badge={pendentesCount && pendentesCount > 0 ? pendentesCount : undefined}
  />
)}
```

Se `NavItem` não suporta `badge`, adicionar a prop opcional:

```tsx
interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  onClick?: () => void;
}

// no render:
<div className="relative">
  <Icon />
  {badge !== undefined && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center">
      {badge}
    </span>
  )}
</div>
```

- [ ] **Step 3: Smoke test**

`npm run dev`. Logar como pais → ver item "Solicitações". Logar como gestor → ver item "Pendências" com contador (se houver pendentes).

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/bottom-nav.tsx
git commit -m "feat(nav): role-aware bottom nav + badges de solicitações/pendências"
```

---

## Fase 5 — UI Gestor

### Task 16: Modal `ModalImpactoMudanca`

**Files:**
- Create: `src/components/shared/ModalImpactoMudanca.tsx`

- [ ] **Step 1: Criar componente**

```tsx
// src/components/shared/ModalImpactoMudanca.tsx
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  recorrencia_id: string;
  aluno_nome: string;
  atual: { dia_semana: number; horario: string };
  novo: { dia_semana: number; horario: string };
}

export function ModalImpactoMudanca({
  open, onClose, onConfirm,
  recorrencia_id, aluno_nome, atual, novo,
}: Props) {
  const { data: sessoesFuturas, isLoading } = useQuery({
    queryKey: ["sessoes_futuras_recorrencia", recorrencia_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessoes")
        .select("id, data_hora")
        .eq("recorrente_id", recorrencia_id)
        .eq("status", "agendada")
        .gt("data_hora", new Date().toISOString())
        .order("data_hora");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const impacto = (sessoesFuturas ?? []).map(s => {
    const nova = calcularNovaDataHora(new Date(s.data_hora), novo.dia_semana, novo.horario);
    return {
      id: s.id,
      atual: new Date(s.data_hora),
      nova,
      cancelada: nova.getTime() <= Date.now(),
    };
  });

  const totalCanceladas = impacto.filter(i => i.cancelada).length;
  const totalMovidas = impacto.filter(i => !i.cancelada).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirmar mudança de horário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="font-medium">{aluno_nome}</div>
          <div className="text-sm">
            De: <strong>{DIAS[atual.dia_semana]} às {atual.horario}</strong><br/>
            Para: <strong>{DIAS[novo.dia_semana]} às {novo.horario}</strong>
          </div>

          {isLoading ? (
            <div>Calculando impacto...</div>
          ) : impacto.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma sessão futura agendada será afetada. A regra recorrente será atualizada.
            </p>
          ) : (
            <>
              <p className="text-sm">
                ⚠ {totalMovidas} sessão(ões) serão movidas. {totalCanceladas > 0 && `${totalCanceladas} serão canceladas (cairiam no passado).`}
              </p>
              <ul className="text-sm max-h-48 overflow-y-auto border rounded p-2 space-y-1">
                {impacto.slice(0, 10).map(i => (
                  <li key={i.id} className={i.cancelada ? "text-red-600" : ""}>
                    {i.atual.toLocaleString("pt-BR")} → {i.cancelada ? "CANCELADA" : i.nova.toLocaleString("pt-BR")}
                  </li>
                ))}
                {impacto.length > 10 && (
                  <li className="text-muted-foreground">... e mais {impacto.length - 10} sessões</li>
                )}
              </ul>
              <p className="text-xs text-muted-foreground">
                Sessões já realizadas ou canceladas não são afetadas.
              </p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={async () => { await onConfirm(); onClose(); }}>
            Confirmar mudança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function calcularNovaDataHora(atual: Date, novoDia: number, novoHorario: string): Date {
  const [hh, mm] = novoHorario.split(":").map(Number);
  const diaAtual = atual.getDay();
  const offsetDias = novoDia - diaAtual;
  const nova = new Date(atual);
  nova.setDate(atual.getDate() + offsetDias);
  nova.setHours(hh, mm, 0, 0);
  return nova;
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ModalImpactoMudanca.tsx
git commit -m "feat(shared): ModalImpactoMudanca com preview de cascata"
```

---

### Task 17: Modal `ModalRejeitarSolicitacao`

**Files:**
- Create: `src/components/gestor/ModalRejeitarSolicitacao.tsx`

- [ ] **Step 1: Criar componente**

```tsx
// src/components/gestor/ModalRejeitarSolicitacao.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo: string | undefined) => Promise<void>;
}

export function ModalRejeitarSolicitacao({ open, onClose, onConfirm }: Props) {
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar solicitação</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Motivo (opcional)</Label>
          <Textarea
            placeholder="Ex: horário sem instrutor disponível, conflito com outra turma..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onConfirm(motivo.trim() || undefined);
                onClose();
              } finally {
                setSubmitting(false);
                setMotivo("");
              }
            }}
          >
            Rejeitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/gestor/ModalRejeitarSolicitacao.tsx
git commit -m "feat(gestor): ModalRejeitarSolicitacao com motivo opcional"
```

---

### Task 18: Página `GestorPendencias` (caixa unificada)

**Files:**
- Create: `src/components/gestor/GestorPendencias.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Criar componente**

```tsx
// src/components/gestor/GestorPendencias.tsx
import { useState } from "react";
import { useSolicitacoes, type SolicitacaoTipo, type SolicitacaoStatus } from "@/hooks/useSolicitacoes";
import { useDecidirSolicitacao } from "@/hooks/useDecidirSolicitacao";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModalRejeitarSolicitacao } from "./ModalRejeitarSolicitacao";
import { ModalImpactoMudanca } from "@/components/shared/ModalImpactoMudanca";
import { toast } from "sonner";

const TIPO_LABEL: Record<SolicitacaoTipo, string> = {
  novo_cadastro: "Novo cadastro",
  mudanca_recorrencia: "Mudança de horário",
  remarcacao_sessao: "Remarcação avulsa",
};

const TIPO_COLOR: Record<SolicitacaoTipo, string> = {
  novo_cadastro: "bg-blue-100 text-blue-800",
  mudanca_recorrencia: "bg-purple-100 text-purple-800",
  remarcacao_sessao: "bg-orange-100 text-orange-800",
};

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function GestorPendencias() {
  const [status, setStatus] = useState<SolicitacaoStatus>("pendente");
  const [tipoFilter, setTipoFilter] = useState<SolicitacaoTipo | "todos">("todos");

  const { data: solicitacoes, isLoading } = useSolicitacoes({ status, tipo: tipoFilter });
  const decidir = useDecidirSolicitacao();

  const [rejeitando, setRejeitando] = useState<string | null>(null);
  const [impactando, setImpactando] = useState<any | null>(null);

  const handleAprovar = async (s: any) => {
    if (s.tipo === "mudanca_recorrencia") {
      setImpactando(s);
      return;
    }
    await aprovarDireto(s.id);
  };

  const aprovarDireto = async (id: string) => {
    try {
      const result = await decidir.mutateAsync({ solicitacao_id: id, decisao: "aprovar" });
      const extra = result.sessoes_atualizadas
        ? ` (${result.sessoes_atualizadas} sessão(ões) movida(s))`
        : "";
      toast.success(`Solicitação aprovada${extra}`);
    } catch (e: any) {
      toast.error(`Erro: ${e.message ?? "falha ao aprovar"}`);
    }
  };

  const handleRejeitar = async (id: string, motivo: string | undefined) => {
    try {
      await decidir.mutateAsync({ solicitacao_id: id, decisao: "rejeitar", motivo });
      toast.success("Solicitação rejeitada");
    } catch (e: any) {
      toast.error(`Erro: ${e.message ?? "falha ao rejeitar"}`);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Pendências</h1>

      <Tabs value={status} onValueChange={(v) => setStatus(v as SolicitacaoStatus)}>
        <TabsList>
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="aprovada">Decididas (aprovadas)</TabsTrigger>
          <TabsTrigger value="rejeitada">Decididas (rejeitadas)</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex gap-2 text-sm">
        {(["todos", "novo_cadastro", "mudanca_recorrencia", "remarcacao_sessao"] as const).map(t => (
          <Button
            key={t}
            size="sm"
            variant={tipoFilter === t ? "default" : "outline"}
            onClick={() => setTipoFilter(t)}
          >
            {t === "todos" ? "Todos" : TIPO_LABEL[t]}
          </Button>
        ))}
      </div>

      {isLoading ? <div>Carregando...</div> : (
        <div className="space-y-3">
          {(solicitacoes ?? []).length === 0 && (
            <p className="text-muted-foreground">Nenhuma solicitação.</p>
          )}
          {(solicitacoes ?? []).map(s => (
            <Card key={s.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className={TIPO_COLOR[s.tipo]}>{TIPO_LABEL[s.tipo]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.criado_em).toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="font-medium">{s.aluno?.nome ?? "—"}</div>
              <Descricao tipo={s.tipo} payload={s.payload} />
              {s.status !== "pendente" && s.motivo_rejeicao && (
                <p className="text-sm text-red-700">
                  <strong>Motivo:</strong> {s.motivo_rejeicao}
                </p>
              )}
              {s.status === "pendente" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => handleAprovar(s)} disabled={decidir.isPending}>
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejeitando(s.id)}
                    disabled={decidir.isPending}
                  >
                    Rejeitar
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ModalRejeitarSolicitacao
        open={rejeitando !== null}
        onClose={() => setRejeitando(null)}
        onConfirm={async (motivo) => {
          if (rejeitando) await handleRejeitar(rejeitando, motivo);
        }}
      />

      {impactando && (
        <ModalImpactoMudanca
          open
          onClose={() => setImpactando(null)}
          onConfirm={async () => { await aprovarDireto(impactando.id); }}
          recorrencia_id={impactando.alvo_id}
          aluno_nome={impactando.aluno?.nome ?? "—"}
          atual={{
            dia_semana: impactando.payload.dia_semana_atual,
            horario: impactando.payload.horario_atual,
          }}
          novo={{
            dia_semana: impactando.payload.dia_semana_novo,
            horario: impactando.payload.horario_novo,
          }}
        />
      )}
    </div>
  );
}

function Descricao({ tipo, payload }: { tipo: SolicitacaoTipo; payload: any }) {
  if (tipo === "mudanca_recorrencia") {
    return (
      <div className="text-sm">
        De: <strong>{DIAS[payload.dia_semana_atual]} {payload.horario_atual}</strong>
        {" → "}
        Para: <strong>{DIAS[payload.dia_semana_novo]} {payload.horario_novo}</strong>
      </div>
    );
  }
  if (tipo === "remarcacao_sessao") {
    return (
      <div className="text-sm">
        De: <strong>{new Date(payload.data_hora_atual).toLocaleString("pt-BR")}</strong>
        {" → "}
        Para: <strong>{new Date(payload.data_hora_nova).toLocaleString("pt-BR")}</strong>
      </div>
    );
  }
  return <div className="text-sm text-muted-foreground">Cadastro de novo praticante aguardando aprovação</div>;
}
```

- [ ] **Step 2: Adicionar rota em `src/App.tsx`**

```tsx
<Route path="/gestor/pendencias" element={<GestorPendencias />} />
```

- [ ] **Step 3: Smoke test end-to-end**

`npm run dev`. Cenário completo:
1. Logar como **pais**, sugerir mudança de horário em uma recorrência
2. Logar como **gestor**, ir em "Pendências"
3. Ver solicitação na lista
4. Clicar **Aprovar** → modal de impacto aparece (com lista de sessões futuras a serem movidas)
5. Confirmar → toast de sucesso, item some
6. Verificar via MCP: `sessoes_recorrentes` atualizada, `solicitacoes.status='aprovada'`, sessões agendadas futuras com `data_hora` atualizado
7. Voltar como pais → ir em "Minhas solicitações" → ver como aprovada

8. Repetir com **Rejeitar** + motivo → verificar `motivo_rejeicao` salvo
9. Repetir com `novo_cadastro` → aprovar → verificar `alunos.status='ativo'`

- [ ] **Step 4: Commit**

```bash
git add src/components/gestor/GestorPendencias.tsx src/App.tsx
git commit -m "feat(gestor): página Pendências unificada com aprovar/rejeitar"
```

---

### Task 19: Gestor edita recorrência direto (`GestorAgenda`)

> Depende do RPC `rpc_atualizar_recorrencia` criado na Task 9.

**Files:**
- Modify: `src/components/gestor/GestorAgenda.tsx`

- [ ] **Step 1: Imports e estado**

No topo do componente:

```typescript
import { ModalSugerirHorario } from "@/components/shared/ModalSugerirHorario";
import { ModalImpactoMudanca } from "@/components/shared/ModalImpactoMudanca";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

const qc = useQueryClient();
const [editando, setEditando] = useState<any | null>(null);
const [impactando, setImpactando] = useState<{ rec: any; novo: { dia_semana: number; horario: string } } | null>(null);
```

- [ ] **Step 2: Adicionar botão "Editar" nos cards de recorrência**

```tsx
<Button size="sm" variant="outline" onClick={() => setEditando(recorrencia)}>
  Editar
</Button>
```

- [ ] **Step 3: Renderizar modais no final do component**

```tsx
{editando && (
  <ModalSugerirHorario
    open
    onClose={() => setEditando(null)}
    modo="recorrencia"
    pularValidacao24h
    atual={{ dia_semana: editando.dia_semana, horario: editando.horario }}
    onSubmit={async (data) => {
      setImpactando({ rec: editando, novo: data });
      setEditando(null);
    }}
  />
)}
{impactando && (
  <ModalImpactoMudanca
    open
    onClose={() => setImpactando(null)}
    onConfirm={async () => {
      try {
        const { data, error } = await supabase.rpc("rpc_atualizar_recorrencia", {
          p_recorrencia_id: impactando.rec.id,
          p_dia_semana: impactando.novo.dia_semana,
          p_horario: impactando.novo.horario,
        });
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["sessoes_recorrentes"] });
        qc.invalidateQueries({ queryKey: ["sessoes"] });
        qc.invalidateQueries({ queryKey: ["solicitacoes"] });
        const extra = (data as any)?.sessoes_atualizadas
          ? ` (${(data as any).sessoes_atualizadas} sessão(ões) movida(s))`
          : "";
        toast.success(`Recorrência atualizada${extra}`);
      } catch (e: any) {
        toast.error(e.message ?? "Erro ao atualizar");
      }
    }}
    recorrencia_id={impactando.rec.id}
    aluno_nome={impactando.rec.aluno?.nome ?? "—"}
    atual={{ dia_semana: impactando.rec.dia_semana, horario: impactando.rec.horario }}
    novo={impactando.novo}
  />
)}
```

> **Nota:** `pularValidacao24h` é a prop adicionada em `ModalSugerirHorario` na Task 20, Step 3. Esta Task 19 assume que a prop existe — se executar Task 19 antes da 20, adicionar a prop primeiro.

- [ ] **Step 4: Smoke test**

`npm run dev`. Como gestor:
1. Ir em agenda
2. Clicar "Editar" em uma recorrência
3. Modal sugere novo horário
4. Após enviar, modal de impacto aparece com lista
5. Confirmar → recorrência atualizada + sessões movidas
6. Verificar via MCP que `sessoes_recorrentes` e `sessoes` foram atualizadas

- [ ] **Step 5: Commit**

```bash
git add src/components/gestor/GestorAgenda.tsx
git commit -m "feat(gestor): editar recorrência direto com modal de impacto (via RPC)"
```

---

### Task 20: Gestor remarca sessão pontual direto

**Files:**
- Modify: `src/components/gestor/GestorAgenda.tsx`

- [ ] **Step 1: Adicionar botão "Remarcar" nos cards de sessão pontual**

```tsx
const [remarcandoSessao, setRemarcandoSessao] = useState<any | null>(null);
const { updateSessao } = useSessoes(/* args existentes */);

// no card:
<Button size="sm" variant="outline" onClick={() => setRemarcandoSessao(sessao)}>
  Remarcar
</Button>
```

- [ ] **Step 2: Renderizar modal**

```tsx
{remarcandoSessao && (
  <ModalSugerirHorario
    open
    onClose={() => setRemarcandoSessao(null)}
    modo="sessao"
    atual={{ data_hora: remarcandoSessao.data_hora }}
    onSubmit={async (data) => {
      try {
        await updateSessao.mutateAsync({
          id: remarcandoSessao.id,
          data_hora: new Date(data.data_hora).toISOString(),
        });
        toast.success("Sessão remarcada");
      } catch (e: any) {
        toast.error(e.message ?? "Erro ao remarcar");
      }
    }}
  />
)}
```

> **Nota:** O `ModalSugerirHorario` no modo `sessao` aplica validação de 24h. Para gestor isso é restrito demais. **Decisão:** adicionar prop `pularValidacao24h?: boolean` ao modal e usar `true` quando aberto pelo gestor.

- [ ] **Step 3: Adicionar prop `pularValidacao24h` em `ModalSugerirHorario`**

Editar [`src/components/shared/ModalSugerirHorario.tsx`](src/components/shared/ModalSugerirHorario.tsx) acrescentando a prop opcional em ambas as interfaces (`PropsRecorrencia` e `PropsSessao`) e condicionando a validação:

```typescript
// dentro do submit handler:
if (!props.pularValidacao24h && diff < 24 * 60 * 60 * 1000) {
  form.setError(...);
  return;
}
```

Usar `pularValidacao24h={true}` nas chamadas do gestor (Tasks 19 e 20).

- [ ] **Step 4: Smoke test**

`npm run dev`. Como gestor: remarcar sessão pontual → confirma → sessão atualizada.

- [ ] **Step 5: Commit**

```bash
git add src/components/gestor/GestorAgenda.tsx src/components/shared/ModalSugerirHorario.tsx
git commit -m "feat(gestor): remarcar sessão pontual direto (sem validação 24h)"
```

---

### Task 21: Badge `Pendente`/`Rejeitado` em `GestorAlunos`

**Files:**
- Modify: `src/components/gestor/GestorAlunos.tsx`

- [ ] **Step 1: Adicionar badge condicional**

Mesmo padrão da Task 11:

```tsx
{aluno.status === "pendente" && (
  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
    Pendente
  </Badge>
)}
{aluno.status === "rejeitado" && (
  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
    Rejeitado
  </Badge>
)}
```

Opcional: adicionar filtro no topo da lista (`Todos | Ativos | Pendentes | Rejeitados`).

- [ ] **Step 2: Smoke test**

`npm run dev`. Como gestor: lista de praticantes mostra badges corretos.

- [ ] **Step 3: Commit**

```bash
git add src/components/gestor/GestorAlunos.tsx
git commit -m "feat(gestor): badges Pendente/Rejeitado em GestorAlunos"
```

---

## Fase 6 — Validação final

### Task 22: Smoke test end-to-end completo + cleanup

- [ ] **Step 1: Build de produção**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
npm run build
```

Esperado: build sem erros TypeScript.

- [ ] **Step 2: Rodar dev e testar todos os fluxos manualmente**

`npm run dev`. Checklist:

**Pais:**
- [ ] Cadastrar novo praticante → vira `pendente`
- [ ] Praticante pendente NÃO pode agendar sessão
- [ ] Sugerir novo horário em recorrência → vira solicitação pendente
- [ ] Tentar sugerir novamente no mesmo item → bloqueado
- [ ] Remarcar sessão pontual → vira solicitação
- [ ] Cancelar sessão pontual → direto (sem solicitação)
- [ ] Tela "Minhas solicitações" lista corretamente, filtros funcionam
- [ ] Validação 24h bloqueia datas próximas

**Gestor:**
- [ ] Ver "Pendências" com contador no menu
- [ ] Aprovar `novo_cadastro` → aluno vira `ativo`
- [ ] Rejeitar `novo_cadastro` com motivo → aluno vira `rejeitado`, motivo salvo
- [ ] Aprovar `mudanca_recorrencia` → modal de impacto aparece → confirmar → recorrência + sessões futuras atualizadas
- [ ] Aprovar `remarcacao_sessao` → sessão atualizada
- [ ] Editar recorrência direto → modal de impacto → atualiza
- [ ] Remarcar sessão pontual direto → atualiza
- [ ] Aba "Decididas" mostra histórico

- [ ] **Step 3: Verificar dados via MCP**

```sql
SELECT status, count(*) FROM alunos GROUP BY status;
SELECT tipo, status, count(*) FROM solicitacoes GROUP BY tipo, status;
```

Confirma que distribuição faz sentido com o que foi testado.

- [ ] **Step 4: Atualizar README ou docs se necessário**

Não criar README novo. Se quiser referenciar o spec no README existente, adicionar 1 linha em "Documentação" apontando pro spec.

- [ ] **Step 5: Commit final**

Só se houver mudanças adicionais:
```bash
git add -A
git commit -m "chore: validação final + cleanup edição de agendamento"
```

- [ ] **Step 6: Push da branch e deploy preview**

```bash
git push origin feat/eliminar-fluxo-email
```

Vercel cria preview automaticamente. Validar a URL de preview com o cliente antes de mergear pra main.

---

## Apêndice: Notas pro implementador

### Gotchas de timezone

A função SQL usa `'America/Sao_Paulo'` hardcoded para cálculo de DOW. Se o app for usado em outro timezone no futuro, parametrizar. Today's date no projeto é tratado em `pt-BR` na UI, então TZ Brasil é consistente.

### DOW convention

- `EXTRACT(DOW FROM ...)` em Postgres: 0=domingo, 1=segunda, ..., 6=sábado.
- `new Date().getDay()` em JS: mesma convenção (0=domingo).
- Migration de `sessoes_recorrentes` ([20260316000000_sessoes_recorrentes.sql:6](../../estancia-tordilha-pwa/supabase/migrations/20260316000000_sessoes_recorrentes.sql#L6)): `dia_semana INTEGER CHECK (dia_semana BETWEEN 0 AND 6)` — alinhado.

### Quando o RPC falha

O Supabase JS SDK retorna o erro do Postgres em `error.message`. Códigos customizados (P0001-P0004) não vêm em `error.code` por padrão — o `error.message` traz o texto da `RAISE EXCEPTION`. A edge function faz parse por substring (`includes("FORBIDDEN")` etc.) — robusto o suficiente pra v1.

### Edge case "gestor edita enquanto há solicitação pendente"

Já tratado dentro de `rpc_atualizar_recorrencia` (Task 9): o RPC marca como `rejeitada` toda solicitação pendente da mesma recorrência com motivo "Gestor aplicou alteração direta". Comportamento descrito na Seção 6 do spec.

### Rotas mencionadas

- `/pais/solicitacoes` — Task 14
- `/gestor/pendencias` — Task 18

Verificar que o `App.tsx` envolve essas rotas em `<RequireRole role="pais">` / `<RequireRole role="gestor">` se houver esse padrão de guard de rota. Caso contrário, adicionar verificação dentro do componente.
