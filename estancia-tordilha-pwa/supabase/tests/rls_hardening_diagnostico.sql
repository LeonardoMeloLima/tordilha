-- Diagnóstico do estado de RLS das tabelas-alvo. Resultado em 2026-06-02:
--   off (corrigidas): notificacoes, avisos, aluno_conquistas
--   off (2ª rodada, usadas no signUp): responsaveis, aluno_responsavel
--   já ON (nada a fazer): mural_comentarios, mural_likes, mural_posts
select c.relname as tabela, c.relrowsecurity as rls_ligado,
       coalesce(array_agg(p.polname) filter (where p.polname is not null), '{}') as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
left join pg_policy p on p.polrelid = c.oid
where c.relname in ('notificacoes','avisos','aluno_conquistas',
  'mural_comentarios','mural_likes','mural_posts','responsaveis','aluno_responsavel')
group by c.relname, c.relrowsecurity order by c.relname;
