create or replace function public.rpc_iniciar_cobertura(
  p_aluno_id uuid,
  p_substituto_id uuid,
  p_tipo text default 'cobertura',
  p_previsao_volta date default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_titular uuid;
  v_cobertura_id uuid;
begin
  if not exists (select 1 from user_roles where user_id = auth.uid() and role = 'gestor') then
    raise exception 'Apenas o gestor pode iniciar cobertura';
  end if;
  if p_tipo not in ('cobertura', 'transferencia') then
    raise exception 'tipo invalido: %', p_tipo;
  end if;

  select professor_id into v_titular from alunos where id = p_aluno_id;
  if v_titular is null then
    raise exception 'Praticante sem terapeuta titular; defina o titular antes de cobrir';
  end if;
  if v_titular = p_substituto_id then
    raise exception 'Substituto nao pode ser o proprio titular';
  end if;

  insert into coberturas (aluno_id, substituto_id, titular_id, tipo, previsao_volta, criada_por)
    values (p_aluno_id, p_substituto_id, v_titular, p_tipo, p_previsao_volta, auth.uid())
    returning id into v_cobertura_id;

  -- Sessões futuras passam para o substituto (passadas ficam com quem atendeu).
  update sessoes set professor_id = p_substituto_id
   where aluno_id = p_aluno_id
     and data_hora >= now()
     and status <> 'cancelada'
     and professor_id = v_titular;

  -- Recorrências acompanham o substituto no período.
  update sessoes_recorrentes set professor_id = p_substituto_id
   where aluno_id = p_aluno_id and ativo = true and professor_id = v_titular;

  if p_tipo = 'transferencia' then
    update alunos set professor_id = p_substituto_id where id = p_aluno_id;
    update coberturas
       set ativo = false, encerrada_por = auth.uid(), encerrada_em = now()
     where id = v_cobertura_id;
  end if;

  return v_cobertura_id;
end $$;
