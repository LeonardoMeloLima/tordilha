-- Fix: o cálculo de DOW anterior colocava a sessão na mesma semana do source
-- (e.g. Sex 22/05 -> Seg 18/05, que cai no passado). Resultado: cascata cancelava
-- todas as sessões futuras em vez de movê-las.
--
-- Correção: usar forward-only offset ((novo_dia - DOW + 7) % 7) para que cada
-- sessão futura seja movida pra próxima ocorrência do novo dia da semana.

CREATE OR REPLACE FUNCTION rpc_decidir_solicitacao(
  p_solicitacao_id UUID,
  p_decisao TEXT,
  p_motivo TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sol           solicitacoes%ROWTYPE;
  v_user_id       UUID := auth.uid();
  v_user_role     TEXT;
  v_novo_dia      INT;
  v_novo_horario  TIME;
  v_nova_dh       TIMESTAMPTZ;
  v_atualizadas   INT := 0;
  v_canceladas    INT := 0;
BEGIN
  SELECT role INTO v_user_role FROM user_roles WHERE user_id = v_user_id LIMIT 1;
  IF v_user_role IS NULL OR v_user_role NOT IN ('gestor', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN' USING errcode = 'P0001';
  END IF;

  IF p_decisao NOT IN ('aprovar', 'rejeitar') THEN
    RAISE EXCEPTION 'INVALID_DECISION' USING errcode = 'P0001';
  END IF;

  SELECT * INTO v_sol FROM solicitacoes WHERE id = p_solicitacao_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND' USING errcode = 'P0002';
  END IF;
  IF v_sol.status <> 'pendente' THEN
    RAISE EXCEPTION 'ALREADY_DECIDED' USING errcode = 'P0003';
  END IF;

  IF p_decisao = 'rejeitar' THEN
    IF v_sol.tipo = 'novo_cadastro' THEN
      UPDATE alunos SET status = 'rejeitado' WHERE id = v_sol.aluno_id;
    END IF;
    UPDATE solicitacoes
       SET status = 'rejeitada',
           motivo_rejeicao = p_motivo,
           decidido_por = v_user_id,
           decidido_em = NOW(),
           atualizado_em = NOW()
     WHERE id = p_solicitacao_id;
    RETURN jsonb_build_object('ok', true, 'decisao', 'rejeitar');
  END IF;

  IF v_sol.tipo = 'novo_cadastro' THEN
    UPDATE alunos SET status = 'ativo' WHERE id = v_sol.aluno_id;

  ELSIF v_sol.tipo = 'mudanca_recorrencia' THEN
    v_novo_dia := (v_sol.payload->>'dia_semana_novo')::INT;
    v_novo_horario := (v_sol.payload->>'horario_novo')::TIME;

    UPDATE sessoes_recorrentes
       SET dia_semana = v_novo_dia,
           horario = v_novo_horario,
           atualizado_em = NOW()
     WHERE id = v_sol.alvo_id;

    WITH affected AS (
      SELECT id,
             (
               (data_hora AT TIME ZONE 'America/Sao_Paulo')::date
               + ((v_novo_dia - EXTRACT(DOW FROM data_hora AT TIME ZONE 'America/Sao_Paulo')::int + 7) % 7)
             )::date + v_novo_horario AS nova_local
      FROM sessoes
      WHERE recorrente_id = v_sol.alvo_id
        AND status = 'agendada'
        AND data_hora > NOW()
    ),
    cancel AS (
      UPDATE sessoes s SET status = 'cancelada'
        FROM affected a
       WHERE s.id = a.id
         AND (a.nova_local AT TIME ZONE 'America/Sao_Paulo') <= NOW()
      RETURNING s.id
    ),
    upd AS (
      UPDATE sessoes s SET data_hora = (a.nova_local AT TIME ZONE 'America/Sao_Paulo')
        FROM affected a
       WHERE s.id = a.id
         AND (a.nova_local AT TIME ZONE 'America/Sao_Paulo') > NOW()
      RETURNING s.id
    )
    SELECT (SELECT count(*) FROM upd), (SELECT count(*) FROM cancel)
      INTO v_atualizadas, v_canceladas;

  ELSIF v_sol.tipo = 'remarcacao_sessao' THEN
    v_nova_dh := (v_sol.payload->>'data_hora_nova')::TIMESTAMPTZ;
    IF v_nova_dh <= NOW() THEN
      RAISE EXCEPTION 'STALE_REQUEST' USING errcode = 'P0004';
    END IF;
    UPDATE sessoes SET data_hora = v_nova_dh WHERE id = v_sol.alvo_id;
  END IF;

  UPDATE solicitacoes
     SET status = 'aprovada',
         decidido_por = v_user_id,
         decidido_em = NOW(),
         atualizado_em = NOW()
   WHERE id = p_solicitacao_id;

  RETURN jsonb_build_object(
    'ok', true,
    'decisao', 'aprovar',
    'sessoes_atualizadas', v_atualizadas,
    'sessoes_canceladas', v_canceladas
  );
END;
$$;

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
           (
             (data_hora AT TIME ZONE 'America/Sao_Paulo')::date
             + ((p_dia_semana - EXTRACT(DOW FROM data_hora AT TIME ZONE 'America/Sao_Paulo')::int + 7) % 7)
           )::date + p_horario AS nova_local
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
