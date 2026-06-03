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
