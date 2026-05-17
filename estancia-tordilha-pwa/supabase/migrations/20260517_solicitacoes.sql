-- supabase/migrations/20260517_solicitacoes.sql
CREATE TABLE solicitacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            TEXT NOT NULL CHECK (tipo IN (
                    'novo_cadastro',
                    'mudanca_recorrencia',
                    'remarcacao_sessao'
                  )),
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN (
                    'pendente', 'aprovada', 'rejeitada'
                  )),

  solicitante_id  UUID NOT NULL REFERENCES auth.users(id),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  alvo_id         UUID NULL,

  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,

  motivo_rejeicao TEXT NULL,
  decidido_por    UUID NULL REFERENCES auth.users(id),
  decidido_em     TIMESTAMPTZ NULL,

  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_solicitacoes_status_criado ON solicitacoes (status, criado_em DESC);
CREATE INDEX idx_solicitacoes_solicitante   ON solicitacoes (solicitante_id);
CREATE INDEX idx_solicitacoes_aluno         ON solicitacoes (aluno_id);

-- Uma única solicitação pendente por (aluno, tipo, alvo)
CREATE UNIQUE INDEX uniq_solicitacao_pendente
  ON solicitacoes (aluno_id, tipo, COALESCE(alvo_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'pendente';

-- RLS
ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;

-- Gestor/admin lê tudo
CREATE POLICY "solicitacoes_gestor_read"
  ON solicitacoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

-- Pais lê só as próprias
CREATE POLICY "solicitacoes_pais_read_own"
  ON solicitacoes FOR SELECT
  USING (solicitante_id = auth.uid());

-- Pais insere as próprias
CREATE POLICY "solicitacoes_pais_insert_own"
  ON solicitacoes FOR INSERT
  WITH CHECK (
    solicitante_id = auth.uid()
    AND status = 'pendente'
    AND decidido_por IS NULL
  );

-- Apenas gestor/admin pode atualizar (decidir)
CREATE POLICY "solicitacoes_gestor_update"
  ON solicitacoes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

COMMENT ON TABLE solicitacoes IS
  'Fila unificada de pendências: novo cadastro de praticante, mudança de recorrência, remarcação de sessão pontual';
