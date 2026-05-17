-- Pivotada: aprovação de solicitações de agendamento agora é bilateral
-- entre pais e terapeuta, com gestor apenas como observador (read-only +
-- alerta de paradas).
--
-- Mudanças:
-- 1. Novo tipo 'nova_recorrencia' (proposta de aula recorrente que ainda
--    não existe — tanto pais quanto terapeuta podem propor).
-- 2. RPC reescrito: aprovador derivado da role do solicitante:
--    - solicitante 'pais'      → aprovador = alunos.professor_id (terapeuta)
--    - solicitante 'professor' → aprovador = qualquer responsável vinculado
--    - tipo 'novo_cadastro'    → aprovador = gestor/admin (mantém)
-- 3. RLS expandido: terapeuta lê pendências dos seus alunos; pais
--    vinculado lê pendências do filho mesmo que não tenha sido o
--    solicitante.

-- ============================================================
-- 1. Permite novo tipo 'nova_recorrencia'
-- ============================================================
ALTER TABLE solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_tipo_check;
ALTER TABLE solicitacoes ADD CONSTRAINT solicitacoes_tipo_check
  CHECK (tipo IN (
    'novo_cadastro',
    'mudanca_recorrencia',
    'remarcacao_sessao',
    'nova_recorrencia'
  ));

-- ============================================================
-- 2. RLS — leitura por terapeuta e por responsável vinculado
-- ============================================================
DROP POLICY IF EXISTS "solicitacoes_terapeuta_read" ON solicitacoes;
CREATE POLICY "solicitacoes_terapeuta_read"
  ON solicitacoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alunos
      WHERE alunos.id = solicitacoes.aluno_id
        AND alunos.professor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "solicitacoes_pais_read_aluno" ON solicitacoes;
CREATE POLICY "solicitacoes_pais_read_aluno"
  ON solicitacoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM aluno_responsavel ar
      INNER JOIN responsaveis r ON r.id = ar.responsavel_id
      WHERE ar.aluno_id = solicitacoes.aluno_id
        AND r.email = (auth.jwt() ->> 'email')
    )
  );

-- ============================================================
-- 3. RPC reescrito com lógica de aprovador bilateral
-- ============================================================
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
  v_sol               solicitacoes%ROWTYPE;
  v_user_id           UUID := auth.uid();
  v_user_email        TEXT := (auth.jwt() ->> 'email');
  v_user_role         TEXT;
  v_solicitante_role  TEXT;
  v_aluno_professor   UUID;
  v_pode_decidir      BOOLEAN := false;
  v_novo_dia          INT;
  v_novo_horario      TIME;
  v_nova_dh           TIMESTAMPTZ;
  v_atualizadas       INT := 0;
  v_canceladas        INT := 0;
  v_new_recorrencia_id UUID;
BEGIN
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

  SELECT role INTO v_user_role FROM user_roles WHERE user_id = v_user_id LIMIT 1;
  SELECT role INTO v_solicitante_role FROM user_roles WHERE user_id = v_sol.solicitante_id LIMIT 1;

  -- ====== Determina se o usuário atual pode decidir ======
  IF v_sol.tipo = 'novo_cadastro' THEN
    -- Cadastro de novo praticante continua sendo decisão do gestor/admin
    v_pode_decidir := v_user_role IN ('gestor', 'admin');
  ELSE
    -- Demais tipos: bilateral pais ↔ terapeuta
    IF v_solicitante_role = 'pais' THEN
      -- Aprovador é o terapeuta do aluno
      SELECT professor_id INTO v_aluno_professor FROM alunos WHERE id = v_sol.aluno_id;
      v_pode_decidir := (v_aluno_professor IS NOT NULL AND v_user_id = v_aluno_professor);
    ELSIF v_solicitante_role = 'professor' THEN
      -- Aprovador é qualquer responsável vinculado ao aluno
      SELECT EXISTS(
        SELECT 1 FROM aluno_responsavel ar
        INNER JOIN responsaveis r ON r.id = ar.responsavel_id
        WHERE ar.aluno_id = v_sol.aluno_id
          AND r.email = v_user_email
      ) INTO v_pode_decidir;
    END IF;
  END IF;

  IF NOT v_pode_decidir THEN
    RAISE EXCEPTION 'FORBIDDEN' USING errcode = 'P0001';
  END IF;

  -- ====== Rejeitar ======
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

  -- ====== Aprovar — switch por tipo ======
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

  ELSIF v_sol.tipo = 'nova_recorrencia' THEN
    v_novo_dia := (v_sol.payload->>'dia_semana')::INT;
    v_novo_horario := (v_sol.payload->>'horario')::TIME;

    -- Sempre usa o professor_id atual do aluno (autoridade clínica).
    -- Se não houver, falha — pais não pode propor recorrência pra
    -- aluno sem terapeuta atribuído.
    SELECT professor_id INTO v_aluno_professor FROM alunos WHERE id = v_sol.aluno_id;
    IF v_aluno_professor IS NULL THEN
      RAISE EXCEPTION 'NO_TERAPEUTA' USING errcode = 'P0005';
    END IF;

    INSERT INTO sessoes_recorrentes (
      aluno_id, professor_id, cavalo_id, dia_semana, horario, ativo
    ) VALUES (
      v_sol.aluno_id,
      v_aluno_professor,
      NULLIF(v_sol.payload->>'cavalo_id', '')::UUID,
      v_novo_dia,
      v_novo_horario,
      true
    )
    RETURNING id INTO v_new_recorrencia_id;
  END IF;

  -- ====== Fecha solicitação ======
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
    'sessoes_canceladas', v_canceladas,
    'nova_recorrencia_id', v_new_recorrencia_id
  );
END;
$$;

REVOKE ALL ON FUNCTION rpc_decidir_solicitacao(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_decidir_solicitacao(UUID, TEXT, TEXT) TO authenticated;
