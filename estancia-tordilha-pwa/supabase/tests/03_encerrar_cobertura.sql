-- Testa rpc_encerrar_cobertura usando dados descartáveis e rollback.
do $$
declare
  v_titular uuid; v_subs uuid; v_aluno uuid; v_cob uuid;
  v_sessao_futura uuid; v_sessao_durante uuid; v_gestor uuid;
begin
  select id into v_titular from public.profiles order by id limit 1;
  select id into v_subs from public.profiles where id <> v_titular order by id limit 1;
  if v_titular is null or v_subs is null then
    raise exception 'PULADO: precisa de >=2 profiles';
  end if;

  select user_id into v_gestor from public.user_roles where role = 'gestor' limit 1;
  if v_gestor is null then
    raise exception 'PULADO: precisa de um user_roles com role=gestor';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestor)::text, true);

  insert into public.alunos (nome, professor_id, ativo, arquivado)
    values ('TESTE_ENCERRA', v_titular, true, false) returning id into v_aluno;
  v_cob := public.rpc_iniciar_cobertura(v_aluno, v_subs, 'cobertura', null);

  -- sessão que "aconteceu durante" a cobertura (passado, já com substituto)
  insert into public.sessoes (aluno_id, professor_id, data_hora, status)
    values (v_aluno, v_subs, now() - interval '1 day', 'agendada') returning id into v_sessao_durante;
  -- sessão futura (foi movida ao substituto ao iniciar; aqui criamos direto no substituto)
  insert into public.sessoes (aluno_id, professor_id, data_hora, status)
    values (v_aluno, v_subs, now() + interval '5 days', 'agendada') returning id into v_sessao_futura;

  perform public.rpc_encerrar_cobertura(v_cob);

  if (select ativo from public.coberturas where id = v_cob) <> false then
    raise exception 'FALHOU: cobertura nao foi encerrada';
  end if;
  if (select professor_id from public.sessoes where id = v_sessao_futura) <> v_titular then
    raise exception 'FALHOU: sessao futura nao voltou ao titular';
  end if;
  if (select professor_id from public.sessoes where id = v_sessao_durante) <> v_subs then
    raise exception 'FALHOU: sessao ocorrida na cobertura deveria permanecer no substituto';
  end if;

  raise notice 'OK: rpc_encerrar_cobertura';
  raise exception 'ROLLBACK_PROPOSITAL';
exception
  when others then
    if sqlerrm <> 'ROLLBACK_PROPOSITAL' then raise; end if;
end $$;
