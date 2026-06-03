-- Liga RLS em aluno_conquistas. Mantém acesso total para usuários logados; fecha anon.
-- (avisos/notificacoes: insert via RPC enviar_comunicado SECURITY DEFINER continua ok.)
alter table public.aluno_conquistas enable row level security;
drop policy if exists "aluno_conquistas_authenticated_all" on public.aluno_conquistas;
create policy "aluno_conquistas_authenticated_all" on public.aluno_conquistas
  for all to authenticated using (true) with check (true);

-- ROLLBACK (rodar se algo quebrar):
-- alter table public.aluno_conquistas disable row level security;
