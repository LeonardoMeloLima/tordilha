-- Tabela de regras de recorrência de sessões
CREATE TABLE sessoes_recorrentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID REFERENCES alunos(id) ON DELETE CASCADE,
  cavalo_id UUID REFERENCES cavalos(id) ON DELETE SET NULL,
  professor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- 0=domingo, 1=segunda, 2=terça, 3=quarta, 4=quinta, 5=sexta, 6=sábado
  dia_semana SMALLINT NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  horario TIME NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Referência de recorrência nas sessões (NULL = sessão avulsa)
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS recorrente_id UUID REFERENCES sessoes_recorrentes(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE sessoes_recorrentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessoes_recorrentes_read_authenticated"
  ON sessoes_recorrentes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "sessoes_recorrentes_gestor_write"
  ON sessoes_recorrentes FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('gestor', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('gestor', 'admin'))
  );
