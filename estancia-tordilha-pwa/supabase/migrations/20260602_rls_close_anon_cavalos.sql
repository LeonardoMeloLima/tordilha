-- Fecha leitura ANÔNIMA de cavalos. Authenticated lê via "Gestor Full Access Cavalos".
drop policy if exists "Acesso público cavalos" on public.cavalos;
-- ROLLBACK: create policy "Acesso público cavalos" on public.cavalos for select using (true);
