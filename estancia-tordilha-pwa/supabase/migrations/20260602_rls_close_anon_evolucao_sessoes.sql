-- Fecha acesso ANÔNIMO a evolucao_sessoes (prontuário de menores). Antes: policies
-- "Allow public read"/"Gestors can manage" eram TO public (anon lia E escrevia).
drop policy if exists "Allow public read access on evolucao_sessoes" on public.evolucao_sessoes;
drop policy if exists "Gestors can manage evolucao_sessoes" on public.evolucao_sessoes;
drop policy if exists "evolucao_sessoes_authenticated_all" on public.evolucao_sessoes;
create policy "evolucao_sessoes_authenticated_all" on public.evolucao_sessoes
  for all to authenticated using (true) with check (true);
-- ROLLBACK: drop policy "evolucao_sessoes_authenticated_all"; recriar as 2 antigas TO public.
