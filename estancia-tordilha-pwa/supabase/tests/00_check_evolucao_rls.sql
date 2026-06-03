-- Rode no SQL Editor do Supabase. Relata RLS e policies de evolucao_sessoes.
-- Interpretação:
--   rls_ligado = false                         -> escrita aberta; PULE a migration 20260602_evolucao_substituto.sql
--   rls_ligado = true + policy de escrita que casa professor_id da sessao OU USING(true) -> substituto ja escreve; PULE
--   rls_ligado = true SEM policy de escrita compativel -> APLIQUE 20260602_evolucao_substituto.sql
select c.relname as tabela, c.relrowsecurity as rls_ligado
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'evolucao_sessoes';

select p.polname as policy, p.polcmd as cmd,
       pg_get_expr(p.polqual, p.polrelid) as using_expr,
       pg_get_expr(p.polwithcheck, p.polrelid) as check_expr
from pg_policy p
join pg_class c on c.oid = p.polrelid
where c.relname = 'evolucao_sessoes';
