-- Testa rpc_iniciar_cobertura usando dados descartáveis e rollback.
do $$
declare
  v_titular uuid; v_subs uuid; v_aluno uuid; v_cob uuid;
  v_sessao_futura uuid; v_sessao_passada uuid; v_gestor uuid;
begin
  -- titular e substituto reais (dois profiles quaisquer)
  select id into v_titular from public.profiles order by id limit 1;
  select id into v_subs from public.profiles where id <> v_titular order by id limit 1;
  if v_titular is null or v_subs is null then
    raise exception 'PULADO: precisa de >=2 profiles para testar';
  end if;

  -- No SQL Editor auth.uid() é NULL; impersonamos um gestor para passar no guard do RPC.
  select user_id into v_gestor from public.user_roles where role = 'gestor' limit 1;
  if v_gestor is null then
    raise exception 'PULADO: precisa de um user_roles com role=gestor';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor)::text, true);

  insert into public.alunos (nome, professor_id, ativo, arquivado)
    values ('TESTE_COBERTURA', v_titular, true, false) returning id into v_aluno;
  insert into public.sessoes (aluno_id, professor_id, data_hora, status)
    values (v_aluno, v_titular, now() + interval '3 days', 'agendada') returning id into v_sessao_futura;
  insert into public.sessoes (aluno_id, professor_id, data_hora, status)
    values (v_aluno, v_titular, now() - interval '3 days', 'agendada') returning id into v_sessao_passada;

  v_cob := public.rpc_iniciar_cobertura(v_aluno, v_subs, 'cobertura', null);

  if (select substituto_id from public.coberturas where id = v_cob) <> v_subs then
    raise exception 'FALHOU: cobertura nao registrou substituto';
  end if;
  if (select professor_id from public.sessoes where id = v_sessao_futura) <> v_subs then
    raise exception 'FALHOU: sessao futura nao foi movida para o substituto';
  end if;
  if (select professor_id from public.sessoes where id = v_sessao_passada) <> v_titular then
    raise exception 'FALHOU: sessao passada NAO deveria ter sido movida';
  end if;
  if (select professor_id from public.alunos where id = v_aluno) <> v_titular then
    raise exception 'FALHOU: titular do aluno mudou numa cobertura temporaria';
  end if;

  raise notice 'OK: rpc_iniciar_cobertura (cobertura)';
  raise exception 'ROLLBACK_PROPOSITAL';  -- desfaz tudo
exception
  when others then
    if sqlerrm <> 'ROLLBACK_PROPOSITAL' then raise; end if;
end $$;
