-- Liga RLS em notificacoes. Mantém acesso total para usuários logados; fecha anon.
-- (avisos/notificacoes: insert via RPC enviar_comunicado SECURITY DEFINER continua ok.)
alter table public.notificacoes enable row level security;
drop policy if exists "notificacoes_authenticated_all" on public.notificacoes;
create policy "notificacoes_authenticated_all" on public.notificacoes
  for all to authenticated using (true) with check (true);

-- ROLLBACK (rodar se algo quebrar):
-- alter table public.notificacoes disable row level security;
