-- supabase/migrations/20260517_aluno_status.sql
ALTER TABLE alunos ADD COLUMN status TEXT NOT NULL DEFAULT 'ativo'
  CHECK (status IN ('pendente', 'ativo', 'rejeitado'));

CREATE INDEX idx_alunos_status ON alunos (status) WHERE status != 'ativo';

COMMENT ON COLUMN alunos.status IS
  'Estado do cadastro: pendente (aguardando aprovação do gestor), ativo (operacional), rejeitado (gestor recusou)';
