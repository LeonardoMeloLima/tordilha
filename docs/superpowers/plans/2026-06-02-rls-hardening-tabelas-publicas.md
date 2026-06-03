# RLS Hardening (Tabelas Públicas) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar RLS nas tabelas públicas que estão sem RLS (alertas CRITICAL do Advisor), com uma policy `FOR ALL TO authenticated` que fecha o acesso anônimo sem remover nenhuma permissão de usuário logado — portanto sem quebrar o app.

**Architecture:** Uma migration SQL por tabela (`ENABLE ROW LEVEL SECURITY` + uma policy permissiva pra `authenticated`), cada uma com rollback de 1 linha. Aplicadas **uma por vez**, com teste do app entre cada. Tabelas tocadas no fluxo de cadastro (`responsaveis`, `aluno_responsavel`) ficam de fora desta rodada.

**Tech Stack:** Supabase Postgres (RLS), Management API (`POST /v1/projects/<ref>/database/query`) ou SQL Editor para aplicar. Sem CLI do Supabase no projeto.

## Contexto crítico (ler antes)

- **Não pode quebrar o app.** A policy `FOR ALL TO authenticated USING(true) WITH CHECK(true)` só **adiciona** permissão pra logado e remove só o `anon`. Pré-checagem já confirmou que as tabelas desta rodada não são acessadas antes do login.
- **Aplicação precisa do banco real** (`ojkvbejaqryjmvevazpj`). Não há PAT salvo no repo (foi removido por segurança). Para aplicar/validar: o usuário roda no SQL Editor, **ou** fornece um PAT na hora e o agente usa a Management API (ver `reference_supabase_validation` na memória). **Uma tabela por vez, testando o app entre cada.**
- **Reversão instantânea:** cada migration tem o rollback comentado no rodapé (`DISABLE ROW LEVEL SECURITY`).
- **Tabelas-alvo desta rodada:** `notificacoes`, `avisos`, `aluno_conquistas`, `mural_comentarios`, `mural_likes`, `mural_posts`. Aplicar **só** nas que o diagnóstico (Task 0) mostrar realmente com RLS off.
- **Fora desta rodada:** `responsaveis`, `aluno_responsavel` (entram numa 2ª rodada após confirmar `autoconfirm`).

---

### Task 0: Diagnóstico — estado real de RLS e config de Auth

Descobrir quais tabelas-alvo estão de fato com RLS off, quais policies já existem, e confirmar (para a 2ª rodada) se o cadastro roda autenticado.

**Files:**
- Create: `estancia-tordilha-pwa/supabase/tests/rls_hardening_diagnostico.sql`

- [ ] **Step 1: Escrever a query de diagnóstico**

Criar `estancia-tordilha-pwa/supabase/tests/rls_hardening_diagnostico.sql`:

```sql
-- (A) Quais tabelas-alvo estão com RLS off e quais policies já têm.
select c.relname as tabela,
       c.relrowsecurity as rls_ligado,
       coalesce(array_agg(p.polname) filter (where p.polname is not null), '{}') as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
left join pg_policy p on p.polrelid = c.oid
where c.relname in (
  'notificacoes','avisos','aluno_conquistas',
  'mural_comentarios','mural_likes','mural_posts',
  'responsaveis','aluno_responsavel'
)
group by c.relname, c.relrowsecurity
order by c.relname;
```

- [ ] **Step 2: Rodar e registrar o resultado**

Rodar no SQL Editor (ou via Management API). Anotar, como comentário no topo do arquivo, **quais tabelas-alvo têm `rls_ligado = false`** — são essas (e só essas) que serão tratadas nas tasks seguintes. Se alguma das 6 incluídas já estiver com `rls_ligado = true`, **pular** a migration dela.

- [ ] **Step 3: (Para a 2ª rodada) Conferir autoconfirm de Auth**

Se houver acesso à Management API, rodar:

```bash
TOKEN=<pat>; REF=ojkvbejaqryjmvevazpj
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.supabase.com/v1/projects/$REF/config/auth" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('mailer_autoconfirm:', d.get('mailer_autoconfirm'))"
```

Anotar o valor. `mailer_autoconfirm = true` (ou sem confirmação de email) ⇒ na 2ª rodada `responsaveis`/`aluno_responsavel` ficam seguras com a mesma policy. Não aplicar nada nelas nesta rodada.

- [ ] **Step 4: Commit**

```bash
git add estancia-tordilha-pwa/supabase/tests/rls_hardening_diagnostico.sql
git commit -m "test(rls): diagnostico de estado de RLS das tabelas publicas"
```

---

### Task 1: Migrations — ligar RLS nas tabelas-alvo (com rollback)

Escrever uma migration por tabela incluída. Conteúdo idêntico em forma; muda só o nome da tabela e da policy. Cada arquivo traz o rollback comentado.

**Files:**
- Create: `estancia-tordilha-pwa/supabase/migrations/20260602_rls_notificacoes.sql`
- Create: `estancia-tordilha-pwa/supabase/migrations/20260602_rls_avisos.sql`
- Create: `estancia-tordilha-pwa/supabase/migrations/20260602_rls_aluno_conquistas.sql`
- Create: `estancia-tordilha-pwa/supabase/migrations/20260602_rls_mural_comentarios.sql`
- Create: `estancia-tordilha-pwa/supabase/migrations/20260602_rls_mural_likes.sql`
- Create: `estancia-tordilha-pwa/supabase/migrations/20260602_rls_mural_posts.sql`

- [ ] **Step 1: Criar `20260602_rls_notificacoes.sql`**

```sql
-- Liga RLS em notificacoes. Mantém acesso total para usuários logados; fecha anon.
-- O insert via RPC enviar_comunicado (SECURITY DEFINER) continua funcionando.
alter table public.notificacoes enable row level security;
drop policy if exists "notificacoes_authenticated_all" on public.notificacoes;
create policy "notificacoes_authenticated_all" on public.notificacoes
  for all to authenticated using (true) with check (true);

-- ROLLBACK (rodar se algo quebrar):
-- alter table public.notificacoes disable row level security;
```

- [ ] **Step 2: Criar `20260602_rls_avisos.sql`**

```sql
-- Liga RLS em avisos. Mantém acesso total para usuários logados; fecha anon.
-- O insert via RPC enviar_comunicado (SECURITY DEFINER) continua funcionando.
alter table public.avisos enable row level security;
drop policy if exists "avisos_authenticated_all" on public.avisos;
create policy "avisos_authenticated_all" on public.avisos
  for all to authenticated using (true) with check (true);

-- ROLLBACK:
-- alter table public.avisos disable row level security;
```

- [ ] **Step 3: Criar `20260602_rls_aluno_conquistas.sql`**

```sql
-- Liga RLS em aluno_conquistas. Não é lida no front; escrita do backend
-- (trigger/função dona da tabela) ignora RLS. Mantém acesso a logados; fecha anon.
alter table public.aluno_conquistas enable row level security;
drop policy if exists "aluno_conquistas_authenticated_all" on public.aluno_conquistas;
create policy "aluno_conquistas_authenticated_all" on public.aluno_conquistas
  for all to authenticated using (true) with check (true);

-- ROLLBACK:
-- alter table public.aluno_conquistas disable row level security;
```

- [ ] **Step 4: Criar `20260602_rls_mural_comentarios.sql`**

```sql
-- Liga RLS em mural_comentarios. Mantém acesso total para usuários logados; fecha anon.
alter table public.mural_comentarios enable row level security;
drop policy if exists "mural_comentarios_authenticated_all" on public.mural_comentarios;
create policy "mural_comentarios_authenticated_all" on public.mural_comentarios
  for all to authenticated using (true) with check (true);

-- ROLLBACK:
-- alter table public.mural_comentarios disable row level security;
```

- [ ] **Step 5: Criar `20260602_rls_mural_likes.sql`**

```sql
-- Liga RLS em mural_likes. Mantém acesso total para usuários logados; fecha anon.
alter table public.mural_likes enable row level security;
drop policy if exists "mural_likes_authenticated_all" on public.mural_likes;
create policy "mural_likes_authenticated_all" on public.mural_likes
  for all to authenticated using (true) with check (true);

-- ROLLBACK:
-- alter table public.mural_likes disable row level security;
```

- [ ] **Step 6: Criar `20260602_rls_mural_posts.sql`**

```sql
-- Liga RLS em mural_posts. Mantém acesso total para usuários logados; fecha anon.
alter table public.mural_posts enable row level security;
drop policy if exists "mural_posts_authenticated_all" on public.mural_posts;
create policy "mural_posts_authenticated_all" on public.mural_posts
  for all to authenticated using (true) with check (true);

-- ROLLBACK:
-- alter table public.mural_posts disable row level security;
```

- [ ] **Step 7: Commit**

```bash
git add estancia-tordilha-pwa/supabase/migrations/20260602_rls_*.sql
git commit -m "feat(db): migrations para ligar RLS nas tabelas publicas (com rollback)"
```

---

### Task 2: Aplicar e validar — UMA tabela por vez

Para **cada** tabela que a Task 0 confirmou com RLS off, na ordem `notificacoes` → `avisos` → `aluno_conquistas` → `mural_comentarios` → `mural_likes` → `mural_posts`. Não aplicar a próxima sem validar a atual.

- [ ] **Step 1: Aplicar a migration da tabela atual**

No SQL Editor (ou via Management API `/database/query`), executar o conteúdo de `20260602_rls_<tabela>.sql` (sem a linha de ROLLBACK).

- [ ] **Step 2: Verificar que o RLS ligou**

```sql
select relname, relrowsecurity from pg_class where relname = '<tabela>';
```
Esperado: `relrowsecurity = true`.

- [ ] **Step 3: Smoke-test no app (logado)**

Conforme a tabela:
- `notificacoes`: abrir o sino/notificações → carregam; marcar como lida funciona.
- `avisos`: lista de avisos/comunicados carrega; gestor envia um comunicado de teste (RPC).
- `aluno_conquistas`: navegar pelo app → nada quebra (não é lida no front).
- `mural_comentarios` / `mural_likes` / `mural_posts`: abrir o mural → posts/comentários/likes carregam; criar post, comentar e curtir funcionam.

- [ ] **Step 4: Se quebrar, reverter na hora**

```sql
alter table public.<tabela> disable row level security;
```
Voltar ao estado anterior e parar para reavaliar antes de continuar.

- [ ] **Step 5: Repetir para a próxima tabela** até cobrir todas as confirmadas na Task 0.

---

### Task 3: Reconferir o Advisor e fechar

- [ ] **Step 1: Sanidade do cadastro**

Como as tabelas do `signUp` (`responsaveis`, `aluno_responsavel`) ficaram de fora, confirmar que o **cadastro de pais continua funcionando** (criar um pais de teste). Nada deve ter regredido.

- [ ] **Step 2: Rodar o Advisor de novo**

No painel do Supabase (Advisors → Security) ou via Management API:
```bash
TOKEN=<pat>; REF=ojkvbejaqryjmvevazpj
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.supabase.com/v1/projects/$REF/advisors?type=security" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print([l.get('name') for l in d.get('lints',[])])"
```
Esperado: os alertas "RLS Disabled in Public" das tabelas tratadas sumiram. Devem restar (no máximo) os de `responsaveis` e `aluno_responsavel`, deixados para a 2ª rodada.

- [ ] **Step 3: Registrar pendência da 2ª rodada**

Se `responsaveis`/`aluno_responsavel` seguem off, anotar (commit ou memória) que a 2ª rodada depende de confirmar `mailer_autoconfirm = true` (Task 0, Step 3) antes de aplicar a mesma policy nelas.

---

## Verificação final

- [ ] Todas as tabelas-alvo confirmadas pela Task 0 agora têm `relrowsecurity = true`.
- [ ] App testado em cada papel sem regressão; cadastro de pais funciona.
- [ ] Advisor sem alertas "RLS Disabled" para as tabelas tratadas.
- [ ] Migrations + rollbacks commitados.
