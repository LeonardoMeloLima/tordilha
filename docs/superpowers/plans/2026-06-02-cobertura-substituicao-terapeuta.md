# Cobertura / Substituição de Terapeuta — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o gestor atribua a um terapeuta substituto (B) o atendimento dos praticantes de um titular (A) que saiu de férias — temporariamente (cobertura, encerrada manualmente) ou definitivamente (transferência) — preservando o titular e o histórico clínico.

**Architecture:** Nova tabela `coberturas` + dois RPCs (`rpc_iniciar_cobertura`, `rpc_encerrar_cobertura`) que movem as sessões futuras entre titular e substituto. O acesso de leitura no banco já é aberto a autenticados, então o recorte "meus praticantes" é resolvido **no cliente** unindo `alunos` + coberturas ativas. O gestor opera tudo; terapeutas só veem o resultado (selos).

**Tech Stack:** Supabase Postgres (RLS, RPC `SECURITY DEFINER`), React 19 + Vite, TanStack Query, shadcn/Radix UI, TypeScript (`tsc -b`).

## Contexto importante (realidade do projeto)

- **Migrations** ficam em `estancia-tordilha-pwa/supabase/migrations/` no padrão `YYYYMMDD_nome.sql`. **Não há Supabase CLI configurado** (sem `config.toml`): as migrations são aplicadas no **SQL Editor do Supabase** (projeto real `ojkvbejaqryjmvevazpj`, conta `suportecftv.rb@gmail.com`). O arquivo de migration é o artefato versionado; aplicá-lo é manual.
- **Não há framework de testes JS** (sem vitest/jest/playwright, sem script `test`). Portanto:
  - Os "testes" de banco são **scripts SQL de asserção** (blocos `DO $$ ... RAISE EXCEPTION ... $$`) executados no SQL Editor. Falham (vermelho) antes da implementação e passam (verde) depois. Guardados em `estancia-tordilha-pwa/supabase/tests/`.
  - Verificação de frontend = `npm run type-check` + `npm run lint` + checagem manual no app.
- Papel gestor é checado por `EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'gestor')`. `profiles.id = auth.uid()`.
- Leitura de `alunos` e `sessoes` é `USING (true)` para autenticados; o recorte por terapeuta é feito na UI.

---

### Task 0: Confirmar RLS atual de `evolucao_sessoes`

**Objetivo:** Saber se a substituta consegue escrever evolução nas sessões repassadas a ela, ou se há policy que bloqueia. Decide se a Task 8b é necessária.

**Files:**
- Create: `estancia-tordilha-pwa/supabase/tests/00_check_evolucao_rls.sql`

- [ ] **Step 1: Escrever a query de inspeção**

Criar `estancia-tordilha-pwa/supabase/tests/00_check_evolucao_rls.sql`:

```sql
-- Rode no SQL Editor do Supabase. Relata RLS e policies de evolucao_sessoes.
select c.relname as tabela, c.relrowsecurity as rls_ligado
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'evolucao_sessoes';

select p.polname as policy, p.polcmd as cmd,
       pg_get_expr(p.polqual, p.polrelid) as using_expr,
       pg_get_expr(p.polwithcheck, p.polrelid) as check_expr
from pg_policy p
join pg_class c on c.oid = p.polrelid
where c.relname = 'evolucao_sessoes';
```

- [ ] **Step 2: Rodar no SQL Editor e registrar o resultado**

Cole o resultado como comentário no topo do arquivo. Interprete:
- **`rls_ligado = false`** → leitura/escrita abertas; nenhuma policy nova necessária. Pule a Task 8b.
- **`rls_ligado = true` com policy de INSERT/UPDATE que casa `professor_id` da sessão ou é `USING (true)`** → a substituta já escreve (a sessão foi repassada a ela). Pule a Task 8b.
- **`rls_ligado = true` sem policy de escrita compatível** → faça a Task 8b.

- [ ] **Step 3: Commit**

```bash
git add estancia-tordilha-pwa/supabase/tests/00_check_evolucao_rls.sql
git commit -m "test: inspeciona RLS de evolucao_sessoes (Task 0 cobertura)"
```

---

### Task 1: Tabela `coberturas` + índices + RLS

**Files:**
- Create: `estancia-tordilha-pwa/supabase/migrations/20260602_coberturas.sql`
- Create: `estancia-tordilha-pwa/supabase/tests/01_coberturas_schema.sql`

- [ ] **Step 1: Escrever o teste de asserção (deve falhar)**

Criar `estancia-tordilha-pwa/supabase/tests/01_coberturas_schema.sql`:

```sql
-- Verde só depois da migration 20260602_coberturas.sql aplicada.
do $$
begin
  if to_regclass('public.coberturas') is null then
    raise exception 'FALHOU: tabela coberturas nao existe';
  end if;

  if not exists (
    select 1 from pg_class c
    where c.relname = 'uniq_cobertura_ativa_por_aluno' and c.relkind = 'i'
  ) then
    raise exception 'FALHOU: indice unico parcial uniq_cobertura_ativa_por_aluno nao existe';
  end if;

  if not (select relrowsecurity from pg_class where relname = 'coberturas') then
    raise exception 'FALHOU: RLS nao esta habilitado em coberturas';
  end if;

  raise notice 'OK: schema de coberturas valido';
end $$;
```

- [ ] **Step 2: Rodar no SQL Editor para confirmar a falha**

Esperado: `ERROR: FALHOU: tabela coberturas nao existe`.

- [ ] **Step 3: Escrever a migration**

Criar `estancia-tordilha-pwa/supabase/migrations/20260602_coberturas.sql`:

```sql
-- Cobertura / substituição de terapeuta (férias) e transferência definitiva.
create table if not exists public.coberturas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  substituto_id uuid not null references public.profiles(id),
  titular_id uuid not null references public.profiles(id),
  tipo text not null default 'cobertura' check (tipo in ('cobertura', 'transferencia')),
  ativo boolean not null default true,
  previsao_volta date,
  criada_por uuid references auth.users(id),
  criada_em timestamptz not null default now(),
  encerrada_por uuid references auth.users(id),
  encerrada_em timestamptz
);

-- No máximo UMA cobertura ativa por praticante.
create unique index if not exists uniq_cobertura_ativa_por_aluno
  on public.coberturas (aluno_id) where ativo = true;

create index if not exists idx_coberturas_substituto_ativo
  on public.coberturas (substituto_id) where ativo = true;
create index if not exists idx_coberturas_titular_ativo
  on public.coberturas (titular_id) where ativo = true;

alter table public.coberturas enable row level security;

-- Leitura: qualquer autenticado (igual a alunos/sessoes); a UI faz o recorte.
create policy "coberturas_read_autenticado"
  on public.coberturas for select
  to authenticated
  using (true);

-- Escrita: só gestor (mas o caminho normal é via RPC SECURITY DEFINER).
create policy "coberturas_gestor_write"
  on public.coberturas for all
  to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'gestor'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'gestor'));
```

- [ ] **Step 4: Aplicar a migration**

Cole o conteúdo da migration no **SQL Editor do Supabase** (projeto `ojkvbejaqryjmvevazpj`) e execute. (Ou, se houver acesso MCP autenticado, use `apply_migration`.)

- [ ] **Step 5: Rodar o teste para confirmar verde**

Rode `01_coberturas_schema.sql` no SQL Editor. Esperado: `NOTICE: OK: schema de coberturas valido`.

- [ ] **Step 6: Commit**

```bash
git add estancia-tordilha-pwa/supabase/migrations/20260602_coberturas.sql estancia-tordilha-pwa/supabase/tests/01_coberturas_schema.sql
git commit -m "feat(db): tabela coberturas + RLS (cobertura/substituicao de terapeuta)"
```

---

### Task 2: RPC `rpc_iniciar_cobertura`

Cria a cobertura, move as sessões futuras A→B e, se `transferencia`, efetiva `alunos.professor_id` e encerra na hora.

**Files:**
- Create: `estancia-tordilha-pwa/supabase/migrations/20260602_rpc_iniciar_cobertura.sql`
- Create: `estancia-tordilha-pwa/supabase/tests/02_iniciar_cobertura.sql`

- [ ] **Step 1: Escrever o teste de asserção (deve falhar)**

Criar `estancia-tordilha-pwa/supabase/tests/02_iniciar_cobertura.sql`:

```sql
-- Testa rpc_iniciar_cobertura usando dados descartáveis e rollback.
do $$
declare
  v_titular uuid; v_subs uuid; v_aluno uuid; v_cob uuid;
  v_sessao_futura uuid; v_sessao_passada uuid; v_gestor uuid;
begin
  -- titular e substituto reais (dois profiles quaisquer)
  select id into v_titular from public.profiles order by id limit 1;
  select id into v_subs from public.profiles where id <> v_titular order by id limit 1;
  if v_titular is null or v_subs is null then
    raise exception 'PULADO: precisa de >=2 profiles para testar';
  end if;

  -- No SQL Editor auth.uid() é NULL; impersonamos um gestor para passar no guard do RPC.
  select user_id into v_gestor from public.user_roles where role = 'gestor' limit 1;
  if v_gestor is null then
    raise exception 'PULADO: precisa de um user_roles com role=gestor';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor)::text, true);

  insert into public.alunos (nome, professor_id, ativo, arquivado)
    values ('TESTE_COBERTURA', v_titular, true, false) returning id into v_aluno;
  insert into public.sessoes (aluno_id, professor_id, data_hora, status)
    values (v_aluno, v_titular, now() + interval '3 days', 'agendada') returning id into v_sessao_futura;
  insert into public.sessoes (aluno_id, professor_id, data_hora, status)
    values (v_aluno, v_titular, now() - interval '3 days', 'agendada') returning id into v_sessao_passada;

  v_cob := public.rpc_iniciar_cobertura(v_aluno, v_subs, 'cobertura', null);

  if (select substituto_id from public.coberturas where id = v_cob) <> v_subs then
    raise exception 'FALHOU: cobertura nao registrou substituto';
  end if;
  if (select professor_id from public.sessoes where id = v_sessao_futura) <> v_subs then
    raise exception 'FALHOU: sessao futura nao foi movida para o substituto';
  end if;
  if (select professor_id from public.sessoes where id = v_sessao_passada) <> v_titular then
    raise exception 'FALHOU: sessao passada NAO deveria ter sido movida';
  end if;
  if (select professor_id from public.alunos where id = v_aluno) <> v_titular then
    raise exception 'FALHOU: titular do aluno mudou numa cobertura temporaria';
  end if;

  raise notice 'OK: rpc_iniciar_cobertura (cobertura)';
  raise exception 'ROLLBACK_PROPOSITAL';  -- desfaz tudo
exception
  when others then
    if sqlerrm <> 'ROLLBACK_PROPOSITAL' then raise; end if;
end $$;
```

- [ ] **Step 2: Rodar para confirmar a falha**

Esperado: erro `function public.rpc_iniciar_cobertura(...) does not exist`.

- [ ] **Step 3: Escrever a migration do RPC**

Criar `estancia-tordilha-pwa/supabase/migrations/20260602_rpc_iniciar_cobertura.sql`:

```sql
create or replace function public.rpc_iniciar_cobertura(
  p_aluno_id uuid,
  p_substituto_id uuid,
  p_tipo text default 'cobertura',
  p_previsao_volta date default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_titular uuid;
  v_cobertura_id uuid;
begin
  if not exists (select 1 from user_roles where user_id = auth.uid() and role = 'gestor') then
    raise exception 'Apenas o gestor pode iniciar cobertura';
  end if;
  if p_tipo not in ('cobertura', 'transferencia') then
    raise exception 'tipo invalido: %', p_tipo;
  end if;

  select professor_id into v_titular from alunos where id = p_aluno_id;
  if v_titular is null then
    raise exception 'Praticante sem terapeuta titular; defina o titular antes de cobrir';
  end if;
  if v_titular = p_substituto_id then
    raise exception 'Substituto nao pode ser o proprio titular';
  end if;

  insert into coberturas (aluno_id, substituto_id, titular_id, tipo, previsao_volta, criada_por)
    values (p_aluno_id, p_substituto_id, v_titular, p_tipo, p_previsao_volta, auth.uid())
    returning id into v_cobertura_id;

  -- Sessões futuras passam para o substituto (passadas ficam com quem atendeu).
  update sessoes set professor_id = p_substituto_id
   where aluno_id = p_aluno_id
     and data_hora >= now()
     and status <> 'cancelada'
     and professor_id = v_titular;

  -- Recorrências acompanham o substituto no período.
  update sessoes_recorrentes set professor_id = p_substituto_id
   where aluno_id = p_aluno_id and ativo = true and professor_id = v_titular;

  if p_tipo = 'transferencia' then
    update alunos set professor_id = p_substituto_id where id = p_aluno_id;
    update coberturas
       set ativo = false, encerrada_por = auth.uid(), encerrada_em = now()
     where id = v_cobertura_id;
  end if;

  return v_cobertura_id;
end $$;
```

- [ ] **Step 4: Aplicar a migration no SQL Editor.**

- [ ] **Step 5: Rodar `02_iniciar_cobertura.sql`.** Esperado: `NOTICE: OK: rpc_iniciar_cobertura (cobertura)` seguido de `ERROR: ROLLBACK_PROPOSITAL` (o erro proposital desfaz os dados de teste — isso é o esperado).

- [ ] **Step 6: Commit**

```bash
git add estancia-tordilha-pwa/supabase/migrations/20260602_rpc_iniciar_cobertura.sql estancia-tordilha-pwa/supabase/tests/02_iniciar_cobertura.sql
git commit -m "feat(db): rpc_iniciar_cobertura move sessoes futuras e trata transferencia"
```

---

### Task 3: RPC `rpc_encerrar_cobertura`

Encerra a cobertura (manual) e devolve as sessões futuras B→A.

**Files:**
- Create: `estancia-tordilha-pwa/supabase/migrations/20260602_rpc_encerrar_cobertura.sql`
- Create: `estancia-tordilha-pwa/supabase/tests/03_encerrar_cobertura.sql`

- [ ] **Step 1: Escrever o teste de asserção (deve falhar)**

Criar `estancia-tordilha-pwa/supabase/tests/03_encerrar_cobertura.sql`:

```sql
do $$
declare
  v_titular uuid; v_subs uuid; v_aluno uuid; v_cob uuid;
  v_sessao_futura uuid; v_sessao_durante uuid; v_gestor uuid;
begin
  select id into v_titular from public.profiles order by id limit 1;
  select id into v_subs from public.profiles where id <> v_titular order by id limit 1;
  if v_titular is null or v_subs is null then
    raise exception 'PULADO: precisa de >=2 profiles';
  end if;

  select user_id into v_gestor from public.user_roles where role = 'gestor' limit 1;
  if v_gestor is null then
    raise exception 'PULADO: precisa de um user_roles com role=gestor';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor)::text, true);

  insert into public.alunos (nome, professor_id, ativo, arquivado)
    values ('TESTE_ENCERRA', v_titular, true, false) returning id into v_aluno;
  v_cob := public.rpc_iniciar_cobertura(v_aluno, v_subs, 'cobertura', null);

  -- sessão que "aconteceu durante" a cobertura (passado, já com substituto)
  insert into public.sessoes (aluno_id, professor_id, data_hora, status)
    values (v_aluno, v_subs, now() - interval '1 day', 'agendada') returning id into v_sessao_durante;
  -- sessão futura (foi movida ao substituto ao iniciar; aqui criamos direto no substituto)
  insert into public.sessoes (aluno_id, professor_id, data_hora, status)
    values (v_aluno, v_subs, now() + interval '5 days', 'agendada') returning id into v_sessao_futura;

  perform public.rpc_encerrar_cobertura(v_cob);

  if (select ativo from public.coberturas where id = v_cob) <> false then
    raise exception 'FALHOU: cobertura nao foi encerrada';
  end if;
  if (select professor_id from public.sessoes where id = v_sessao_futura) <> v_titular then
    raise exception 'FALHOU: sessao futura nao voltou ao titular';
  end if;
  if (select professor_id from public.sessoes where id = v_sessao_durante) <> v_subs then
    raise exception 'FALHOU: sessao ocorrida na cobertura deveria permanecer no substituto';
  end if;

  raise notice 'OK: rpc_encerrar_cobertura';
  raise exception 'ROLLBACK_PROPOSITAL';
exception
  when others then
    if sqlerrm <> 'ROLLBACK_PROPOSITAL' then raise; end if;
end $$;
```

- [ ] **Step 2: Rodar para confirmar a falha** (`function rpc_encerrar_cobertura does not exist`).

- [ ] **Step 3: Escrever a migration**

Criar `estancia-tordilha-pwa/supabase/migrations/20260602_rpc_encerrar_cobertura.sql`:

```sql
create or replace function public.rpc_encerrar_cobertura(p_cobertura_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno uuid; v_titular uuid; v_subs uuid; v_ativo boolean;
begin
  if not exists (select 1 from user_roles where user_id = auth.uid() and role = 'gestor') then
    raise exception 'Apenas o gestor pode encerrar cobertura';
  end if;

  select aluno_id, titular_id, substituto_id, ativo
    into v_aluno, v_titular, v_subs, v_ativo
    from coberturas where id = p_cobertura_id;
  if v_aluno is null then
    raise exception 'Cobertura nao encontrada';
  end if;
  if v_ativo is not true then
    raise exception 'Cobertura ja encerrada';
  end if;

  -- Sessões futuras voltam ao titular; as já ocorridas ficam com o substituto.
  update sessoes set professor_id = v_titular
   where aluno_id = v_aluno
     and data_hora >= now()
     and status <> 'cancelada'
     and professor_id = v_subs;

  update sessoes_recorrentes set professor_id = v_titular
   where aluno_id = v_aluno and ativo = true and professor_id = v_subs;

  update coberturas
     set ativo = false, encerrada_por = auth.uid(), encerrada_em = now()
   where id = p_cobertura_id;
end $$;
```

- [ ] **Step 4: Aplicar a migration no SQL Editor.**

- [ ] **Step 5: Rodar `03_encerrar_cobertura.sql`.** Esperado: `NOTICE: OK: rpc_encerrar_cobertura` seguido de `ERROR: ROLLBACK_PROPOSITAL`.

- [ ] **Step 6: Commit**

```bash
git add estancia-tordilha-pwa/supabase/migrations/20260602_rpc_encerrar_cobertura.sql estancia-tordilha-pwa/supabase/tests/03_encerrar_cobertura.sql
git commit -m "feat(db): rpc_encerrar_cobertura devolve sessoes futuras ao titular"
```

---

### Task 4: Regerar tipos do banco (`database.types.ts`)

**Files:**
- Modify: `estancia-tordilha-pwa/src/types/database.types.ts`

- [ ] **Step 1: Gerar os tipos**

Se houver MCP Supabase autenticado, use `generate_typescript_types` (projeto `ojkvbejaqryjmvevazpj`) e substitua o conteúdo de `database.types.ts`. Caso contrário, no Dashboard do Supabase: **Database → API Docs → (gerar tipos TypeScript)**, ou rode localmente com token:

```bash
npx supabase gen types typescript --project-id ojkvbejaqryjmvevazpj > estancia-tordilha-pwa/src/types/database.types.ts
```

- [ ] **Step 2: Confirmar que `coberturas` apareceu nos tipos**

Run: `grep -n "coberturas" estancia-tordilha-pwa/src/types/database.types.ts`
Esperado: linhas referenciando a tabela `coberturas`.

- [ ] **Step 3: Type-check**

Run: `cd estancia-tordilha-pwa && npm run type-check`
Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add estancia-tordilha-pwa/src/types/database.types.ts
git commit -m "chore(types): regenera database.types com tabela coberturas"
```

---

### Task 5: Hook `useCoberturas`

Centraliza leitura das coberturas ativas e as mutations que chamam os RPCs.

**Files:**
- Create: `estancia-tordilha-pwa/src/hooks/useCoberturas.ts`

- [ ] **Step 1: Escrever o hook**

Criar `estancia-tordilha-pwa/src/hooks/useCoberturas.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Cobertura = {
  id: string;
  aluno_id: string;
  substituto_id: string;
  titular_id: string;
  tipo: "cobertura" | "transferencia";
  ativo: boolean;
  previsao_volta: string | null;
  criada_em: string;
};

/** Coberturas ativas. Leitura é aberta a autenticados; o recorte é feito por quem consome. */
export function useCoberturas() {
  const queryClient = useQueryClient();

  const coberturasQuery = useQuery({
    queryKey: ["coberturas", "ativas"],
    queryFn: async (): Promise<Cobertura[]> => {
      const { data, error } = await supabase
        .from("coberturas")
        .select("id, aluno_id, substituto_id, titular_id, tipo, ativo, previsao_volta, criada_em")
        .eq("ativo", true);
      if (error) throw error;
      return (data ?? []) as Cobertura[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["coberturas"] });
    queryClient.invalidateQueries({ queryKey: ["sessoes"] });
    queryClient.invalidateQueries({ queryKey: ["alunos"] });
  };

  const iniciarCobertura = useMutation({
    mutationFn: async (args: {
      alunoId: string;
      substitutoId: string;
      tipo: "cobertura" | "transferencia";
      previsaoVolta?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("rpc_iniciar_cobertura", {
        p_aluno_id: args.alunoId,
        p_substituto_id: args.substitutoId,
        p_tipo: args.tipo,
        p_previsao_volta: args.previsaoVolta ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidate,
  });

  const encerrarCobertura = useMutation({
    mutationFn: async (coberturaId: string) => {
      const { error } = await supabase.rpc("rpc_encerrar_cobertura", {
        p_cobertura_id: coberturaId,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    coberturas: coberturasQuery.data ?? [],
    isLoading: coberturasQuery.isLoading,
    iniciarCobertura,
    encerrarCobertura,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `cd estancia-tordilha-pwa && npm run type-check`
Esperado: sem erros. (Se o `.rpc` reclamar de nome desconhecido, confirme que a Task 4 regenerou os tipos com os RPCs.)

- [ ] **Step 3: Commit**

```bash
git add estancia-tordilha-pwa/src/hooks/useCoberturas.ts
git commit -m "feat(hook): useCoberturas (lista ativas + iniciar/encerrar via RPC)"
```

---

### Task 6: Caseload do terapeuta inclui praticantes cobertos + selos

A lista "Meus Praticantes" passa a mostrar também quem o terapeuta cobre, e os selos de cobertura nos dois lados.

**Files:**
- Modify: `estancia-tordilha-pwa/src/components/professor/ProfessorAlunos.tsx`

- [ ] **Step 1: Importar o hook e os dados de cobertura**

Em `ProfessorAlunos.tsx`, após a linha `import { FichaAtendimentoModal } from "./FichaAtendimentoModal";` (linha 7), adicionar:

```tsx
import { useCoberturas } from "@/hooks/useCoberturas";
import { useProfessores } from "@/hooks/useProfessores";
```

- [ ] **Step 2: Computar a lista unindo titular + coberturas ativas**

Substituir o bloco `meusAlunos` (linhas 19-22) por:

```tsx
  const { coberturas } = useCoberturas();
  const { professores } = useProfessores();

  const nomeProf = (id?: string | null) =>
    professores.find((p) => p.id === id)?.full_name || "outro terapeuta";

  // IDs que estou cobrindo agora (sou o substituto)
  const coberturasComoSubstituto = useMemo(
    () => coberturas.filter((c) => c.substituto_id === userId),
    [coberturas, userId]
  );
  const alunoIdsCobertos = useMemo(
    () => new Set(coberturasComoSubstituto.map((c) => c.aluno_id)),
    [coberturasComoSubstituto]
  );
  // Praticantes meus que estão sendo cobertos por outra pessoa (sou titular)
  const coberturaDoMeuAluno = useMemo(() => {
    const map = new Map<string, string>(); // aluno_id -> substituto_id
    coberturas.forEach((c) => {
      if (c.titular_id === userId) map.set(c.aluno_id, c.substituto_id);
    });
    return map;
  }, [coberturas, userId]);

  // "Meus praticantes" = sou titular OU tenho cobertura ativa sobre o aluno
  const meusAlunos = useMemo(() => {
    if (!userId) return [];
    return alunos.filter(
      (a: any) => a.professor_id === userId || alunoIdsCobertos.has(a.id)
    );
  }, [alunos, userId, alunoIdsCobertos]);
```

- [ ] **Step 3: Renderizar os selos no card**

Dentro do `.map((a) => ...)`, logo após o bloco do nome do praticante (depois da linha 87 `</div>` que fecha o `flex-1 min-w-0`), e antes do bloco de status (linha 88), inserir:

```tsx
                {alunoIdsCobertos.has(a.id) && (
                  <span className="px-2 py-1 text-[10px] font-extrabold rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                    COBERTURA DE {nomeProf(
                      coberturasComoSubstituto.find((c) => c.aluno_id === a.id)?.titular_id
                    ).toUpperCase()}
                  </span>
                )}
                {coberturaDoMeuAluno.has(a.id) && (
                  <span className="px-2 py-1 text-[10px] font-extrabold rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                    EM COBERTURA POR {nomeProf(coberturaDoMeuAluno.get(a.id)).toUpperCase()}
                  </span>
                )}
```

- [ ] **Step 4: Type-check + lint**

Run: `cd estancia-tordilha-pwa && npm run type-check && npm run lint`
Esperado: sem erros.

- [ ] **Step 5: Verificação manual**

Run: `cd estancia-tordilha-pwa && npm run dev`
Logue como a terapeuta substituta (B): o praticante coberto deve aparecer na lista com o selo "COBERTURA DE [A]". Como titular (A) com um aluno coberto: selo "EM COBERTURA POR [B]".

- [ ] **Step 6: Commit**

```bash
git add estancia-tordilha-pwa/src/components/professor/ProfessorAlunos.tsx
git commit -m "feat(professor): caseload inclui praticantes cobertos + selos de cobertura"
```

---

### Task 7: UI do gestor — atribuir e encerrar cobertura/transferência

Seção "Cobertura / Substituição" dentro da ficha do praticante no Admin.

**Files:**
- Modify: `estancia-tordilha-pwa/src/components/gestor/GestorAlunos.tsx`

- [ ] **Step 1: Importar hook de coberturas e ícone**

Em `GestorAlunos.tsx`, após `import { Badge } from "@/components/ui/badge";` (linha 13), adicionar:

```tsx
import { useCoberturas } from "@/hooks/useCoberturas";
import { Repeat } from "lucide-react";
```

- [ ] **Step 2: Estado do formulário de cobertura + hook**

Após a linha `const { professores } = useProfessores();` (linha 17), adicionar:

```tsx
  const { coberturas, iniciarCobertura, encerrarCobertura } = useCoberturas();
  const [cobForm, setCobForm] = useState<{ substituto_id: string; tipo: "cobertura" | "transferencia"; previsao_volta: string }>(
    { substituto_id: "", tipo: "cobertura", previsao_volta: "" }
  );
```

- [ ] **Step 3: Handlers de iniciar/encerrar**

Antes do `return (` (linha 200), adicionar:

```tsx
  const coberturaAtivaDoAluno = selectedAluno
    ? coberturas.find((c) => c.aluno_id === selectedAluno.id)
    : undefined;

  const handleIniciarCobertura = async () => {
    if (!selectedAluno) return;
    if (!selectedAluno.professor_id) {
      toast({ variant: "destructive", title: "Sem titular", description: "Defina o terapeuta responsável antes de cobrir." });
      return;
    }
    if (!cobForm.substituto_id) {
      toast({ variant: "destructive", title: "Escolha o substituto", description: "Selecione quem vai cobrir." });
      return;
    }
    try {
      await iniciarCobertura.mutateAsync({
        alunoId: selectedAluno.id,
        substitutoId: cobForm.substituto_id,
        tipo: cobForm.tipo,
        previsaoVolta: cobForm.previsao_volta || null,
      });
      setCobForm({ substituto_id: "", tipo: "cobertura", previsao_volta: "" });
      toast({ title: "Pronto", description: cobForm.tipo === "transferencia" ? "Praticante transferido." : "Cobertura iniciada." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const handleEncerrarCobertura = async () => {
    if (!coberturaAtivaDoAluno) return;
    try {
      await encerrarCobertura.mutateAsync(coberturaAtivaDoAluno.id);
      toast({ title: "Encerrada", description: "Praticante voltou ao terapeuta titular." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };
```

- [ ] **Step 4: Renderizar a seção na ficha**

Dentro do `<ActionSheet>`, logo após o bloco de "Professor assignment" (o `</div>` que fecha o bloco iniciado na linha 414, antes do bloco `grid grid-cols-2 ... opacity-60` na linha 440), inserir:

```tsx
          {/* Cobertura / Substituição — só na edição de um praticante existente */}
          {selectedAluno && (
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Repeat size={16} className="text-primary" />
                Cobertura / Substituição
              </label>

              {coberturaAtivaDoAluno ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                  <p className="text-sm font-semibold text-amber-800">
                    Em cobertura por{" "}
                    {professores.find((p) => p.id === coberturaAtivaDoAluno.substituto_id)?.full_name || "substituto"}
                    {coberturaAtivaDoAluno.previsao_volta
                      ? ` · previsão de volta ${new Date(coberturaAtivaDoAluno.previsao_volta).toLocaleDateString("pt-BR")}`
                      : ""}
                  </p>
                  <button
                    type="button"
                    onClick={handleEncerrarCobertura}
                    disabled={encerrarCobertura.isPending}
                    className="w-full h-11 bg-amber-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                  >
                    {encerrarCobertura.isPending ? "Encerrando..." : "Encerrar cobertura (voltar ao titular)"}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <select
                    value={cobForm.substituto_id}
                    onChange={(e) => setCobForm({ ...cobForm, substituto_id: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 text-sm font-medium"
                  >
                    <option value="">— Quem vai cobrir? —</option>
                    {professores
                      .filter((p) => p.id !== selectedAluno.professor_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.full_name || "Terapeuta sem nome"}</option>
                      ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={cobForm.tipo}
                      onChange={(e) => setCobForm({ ...cobForm, tipo: e.target.value as "cobertura" | "transferencia" })}
                      className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 text-sm font-medium"
                    >
                      <option value="cobertura">Cobertura (temporária)</option>
                      <option value="transferencia">Transferência (definitiva)</option>
                    </select>
                    <input
                      type="date"
                      value={cobForm.previsao_volta}
                      onChange={(e) => setCobForm({ ...cobForm, previsao_volta: e.target.value })}
                      disabled={cobForm.tipo === "transferencia"}
                      className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 text-sm font-medium disabled:opacity-40"
                      title="Previsão de volta (opcional)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleIniciarCobertura}
                    disabled={iniciarCobertura.isPending}
                    className="w-full h-11 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                  >
                    {iniciarCobertura.isPending ? "Aplicando..." : "Atribuir"}
                  </button>
                </div>
              )}
            </div>
          )}
```

- [ ] **Step 5: Type-check + lint**

Run: `cd estancia-tordilha-pwa && npm run type-check && npm run lint`
Esperado: sem erros.

- [ ] **Step 6: Verificação manual**

Run: `cd estancia-tordilha-pwa && npm run dev`
Como gestor: abra a ficha de um praticante com titular definido → seção "Cobertura / Substituição" → escolha substituto + tipo → "Atribuir". Reabra: deve mostrar "Em cobertura por [B]" + botão "Encerrar". Encerre e confirme que some.

- [ ] **Step 7: Commit**

```bash
git add estancia-tordilha-pwa/src/components/gestor/GestorAlunos.tsx
git commit -m "feat(gestor): atribuir/encerrar cobertura e transferencia na ficha do praticante"
```

---

### Task 8 (CONDICIONAL): Policy de escrita de evolução para o substituto

**Só execute se a Task 0 concluiu que `evolucao_sessoes` tem RLS ligado SEM policy de escrita compatível.** Caso contrário, pule.

**Files:**
- Create: `estancia-tordilha-pwa/supabase/migrations/20260602_evolucao_substituto.sql`

- [ ] **Step 1: Escrever a policy**

A evolução é presa à sessão, e a sessão do período já tem `professor_id = substituto`. Permitir insert/update de evolução quando o usuário é o professor da sessão referenciada, sem permitir editar evolução de sessão de outro professor (preserva os registros antigos da titular):

```sql
-- Substituto (e qualquer professor) escreve evolução apenas de sessões que são dele.
create policy "evolucao_professor_da_sessao_insert"
  on public.evolucao_sessoes for insert to authenticated
  with check (exists (
    select 1 from public.sessoes s
    where s.id = evolucao_sessoes.sessao_id and s.professor_id = auth.uid()
  ));

create policy "evolucao_professor_da_sessao_update"
  on public.evolucao_sessoes for update to authenticated
  using (exists (
    select 1 from public.sessoes s
    where s.id = evolucao_sessoes.sessao_id and s.professor_id = auth.uid()
  ));
```

- [ ] **Step 2: Aplicar no SQL Editor.**

- [ ] **Step 3: Verificação manual**

Logue como substituta (B), abra uma sessão futura do praticante coberto e registre uma evolução → deve salvar. Tente abrir uma evolução antiga da titular → não deve permitir edição.

- [ ] **Step 4: Commit**

```bash
git add estancia-tordilha-pwa/supabase/migrations/20260602_evolucao_substituto.sql
git commit -m "feat(db): substituto registra evolucao das sessoes dele (sem editar as antigas)"
```

---

## Verificação final (todas as tarefas)

- [ ] `cd estancia-tordilha-pwa && npm run type-check && npm run lint` — limpo.
- [ ] Scripts `01`, `02`, `03` em `supabase/tests/` rodam verde no SQL Editor.
- [ ] Fluxo manual ponta-a-ponta: gestor cria cobertura → B vê o praticante e a agenda → B registra evolução → gestor encerra → praticante volta para A; sessões já ocorridas permanecem na B.
- [ ] Transferência definitiva: `alunos.professor_id` vira B e não há volta.
