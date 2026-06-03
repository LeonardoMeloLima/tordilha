create or replace function public.rpc_encerrar_cobertura(p_cobertura_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno uuid; v_titular uuid; v_subs uuid; v_ativo boolean;
begin
  if not exists (select 1 from user_roles where user_id = auth.uid() and role = 'gestor') then
    raise exception 'Apenas o gestor pode encerrar cobertura';
  end if;

  select aluno_id, titular_id, substituto_id, ativo
    into v_aluno, v_titular, v_subs, v_ativo
    from coberturas where id = p_cobertura_id;
  if v_aluno is null then
    raise exception 'Cobertura nao encontrada';
  end if;
  if v_ativo is not true then
    raise exception 'Cobertura ja encerrada';
  end if;

  -- Sessões futuras voltam ao titular; as já ocorridas ficam com o substituto.
  update sessoes set professor_id = v_titular
   where aluno_id = v_aluno
     and data_hora >= now()
     and status <> 'cancelada'
     and professor_id = v_subs;

  update sessoes_recorrentes set professor_id = v_titular
   where aluno_id = v_aluno and ativo = true and professor_id = v_subs;

  update coberturas
     set ativo = false, encerrada_por = auth.uid(), encerrada_em = now()
   where id = p_cobertura_id;
end $$;
