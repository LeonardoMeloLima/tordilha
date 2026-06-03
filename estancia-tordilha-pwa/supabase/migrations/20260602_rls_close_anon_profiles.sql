-- Fecha leitura ANÔNIMA de profiles (nomes/emails da equipe) -> só autenticado.
drop policy if exists "Acesso público leitura" on public.profiles;
drop policy if exists "profiles_authenticated_read" on public.profiles;
create policy "profiles_authenticated_read" on public.profiles
  for select to authenticated using (true);
-- ROLLBACK: drop policy "profiles_authenticated_read"; create policy "Acesso público leitura" on public.profiles for select using (true);
