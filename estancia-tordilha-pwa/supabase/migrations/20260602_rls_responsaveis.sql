-- Liga RLS em responsaveis. Mantém acesso total para usuários logados; fecha anon.
-- Seguro pro cadastro de pais: mailer_autoconfirm=true => signUp já cria sessão,
-- então as inserções do cadastro rodam autenticadas (provado: INSERT autenticado OK).
alter table public.responsaveis enable row level security;
drop policy if exists "responsaveis_authenticated_all" on public.responsaveis;
create policy "responsaveis_authenticated_all" on public.responsaveis
  for all to authenticated using (true) with check (true);

-- ROLLBACK (rodar se algo quebrar):
-- alter table public.responsaveis disable row level security;
