-- Liga RLS em aluno_responsavel. Mantém acesso total para usuários logados; fecha anon.
-- Seguro pro cadastro de pais: mailer_autoconfirm=true => signUp já cria sessão,
-- então as inserções do cadastro rodam autenticadas (provado: INSERT autenticado OK).
alter table public.aluno_responsavel enable row level security;
drop policy if exists "aluno_responsavel_authenticated_all" on public.aluno_responsavel;
create policy "aluno_responsavel_authenticated_all" on public.aluno_responsavel
  for all to authenticated using (true) with check (true);

-- ROLLBACK (rodar se algo quebrar):
-- alter table public.aluno_responsavel disable row level security;
