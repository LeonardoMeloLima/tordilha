-- supabase/migrations/20260517_rpc_atualizar_recorrencia.sql
CREATE OR REPLACE FUNCTION rpc_atualizar_recorrencia(
  p_recorrencia_id UUID,
  p_dia_semana INT,
  p_horario TIME
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_atualizadas INT := 0;
  v_canceladas INT := 0;
BEGIN
  SELECT role INTO v_user_role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
  IF v_user_role IS NULL OR v_user_role NOT IN ('gestor', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN' USING errcode = 'P0001';
  END IF;

  UPDATE sessoes_recorrentes
     SET dia_semana = p_dia_semana, horario = p_horario, atualizado_em = NOW()
   WHERE id = p_recorrencia_id;

  WITH affected AS (
    SELECT id,
           ((data_hora AT TIME ZONE 'America/Sao_Paulo')::date
             - EXTRACT(DOW FROM data_hora AT TIME ZONE 'America/Sao_Paulo')::int
             + p_dia_semana)::date + p_horario AS nova_local
    FROM sessoes
    WHERE recorrente_id = p_recorrencia_id
      AND status = 'agendada'
      AND data_hora > NOW()
  ),
  cancel AS (
    UPDATE sessoes s SET status = 'cancelada' FROM affected a
     WHERE s.id = a.id AND (a.nova_local AT TIME ZONE 'America/Sao_Paulo') <= NOW()
    RETURNING s.id
  ),
  upd AS (
    UPDATE sessoes s SET data_hora = (a.nova_local AT TIME ZONE 'America/Sao_Paulo')
      FROM affected a
     WHERE s.id = a.id AND (a.nova_local AT TIME ZONE 'America/Sao_Paulo') > NOW()
    RETURNING s.id
  )
  SELECT (SELECT count(*) FROM upd), (SELECT count(*) FROM cancel)
    INTO v_atualizadas, v_canceladas;

  -- Invalida solicitações pendentes da mesma recorrência (edge case spec §6)
  UPDATE solicitacoes
     SET status = 'rejeitada',
         motivo_rejeicao = 'Gestor aplicou alteração direta',
         decidido_por = auth.uid(),
         decidido_em = NOW(),
         atualizado_em = NOW()
   WHERE alvo_id = p_recorrencia_id
     AND tipo = 'mudanca_recorrencia'
     AND status = 'pendente';

  RETURN jsonb_build_object(
    'ok', true,
    'sessoes_atualizadas', v_atualizadas,
    'sessoes_canceladas', v_canceladas
  );
END;
$$;

REVOKE ALL ON FUNCTION rpc_atualizar_recorrencia(UUID, INT, TIME) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_atualizar_recorrencia(UUID, INT, TIME) TO authenticated;
