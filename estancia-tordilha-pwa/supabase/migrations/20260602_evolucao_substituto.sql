-- CONDICIONAL: aplique SOMENTE se a inspeção (tests/00_check_evolucao_rls.sql) mostrar
-- que evolucao_sessoes tem RLS ligado SEM policy de escrita compatível.
-- A evolução é presa à sessão, e a sessão do período já tem professor_id = substituto.
-- Permite insert/update de evolução quando o usuário é o professor da sessão referenciada,
-- sem permitir editar evolução de sessão de outro professor (preserva registros antigos da titular).

create policy "evolucao_professor_da_sessao_insert"
  on public.evolucao_sessoes for insert to authenticated
  with check (exists (
    select 1 from public.sessoes s
    where s.id = evolucao_sessoes.sessao_id and s.professor_id = auth.uid()
  ));

create policy "evolucao_professor_da_sessao_update"
  on public.evolucao_sessoes for update to authenticated
  using (exists (
    select 1 from public.sessoes s
    where s.id = evolucao_sessoes.sessao_id and s.professor_id = auth.uid()
  ));
