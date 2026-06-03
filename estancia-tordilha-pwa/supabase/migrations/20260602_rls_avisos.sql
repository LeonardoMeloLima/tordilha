-- Liga RLS em avisos. Mantém acesso total para usuários logados; fecha anon.
-- (avisos/notificacoes: insert via RPC enviar_comunicado SECURITY DEFINER continua ok.)
alter table public.avisos enable row level security;
drop policy if exists "avisos_authenticated_all" on public.avisos;
create policy "avisos_authenticated_all" on public.avisos
  for all to authenticated using (true) with check (true);

-- ROLLBACK (rodar se algo quebrar):
-- alter table public.avisos disable row level security;
