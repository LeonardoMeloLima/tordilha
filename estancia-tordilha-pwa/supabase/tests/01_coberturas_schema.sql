-- Verde só depois da migration 20260602_coberturas.sql aplicada.
do $$
begin
  if to_regclass('public.coberturas') is null then
    raise exception 'FALHOU: tabela coberturas nao existe';
  end if;

  if not exists (
    select 1 from pg_class c
    where c.relname = 'uniq_cobertura_ativa_por_aluno' and c.relkind = 'i'
  ) then
    raise exception 'FALHOU: indice unico parcial uniq_cobertura_ativa_por_aluno nao existe';
  end if;

  if not (select relrowsecurity from pg_class where relname = 'coberturas') then
    raise exception 'FALHOU: RLS nao esta habilitado em coberturas';
  end if;

  raise notice 'OK: schema de coberturas valido';
end $$;
