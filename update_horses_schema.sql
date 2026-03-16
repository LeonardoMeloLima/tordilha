-- Migration: Add technical assessment fields to horses table
ALTER TABLE cavalos 
ADD COLUMN IF NOT EXISTS ano_nascimento INTEGER,
ADD COLUMN IF NOT EXISTS sexo TEXT CHECK (sexo IN ('Macho', 'Fêmea')),
ADD COLUMN IF NOT EXISTS castrado BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS altura NUMERIC,
ADD COLUMN IF NOT EXISTS peso NUMERIC,
ADD COLUMN IF NOT EXISTS pelagem TEXT,
ADD COLUMN IF NOT EXISTS movimento_3d_predominante TEXT,
ADD COLUMN IF NOT EXISTS avaliacao_marcha JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS avaliacao_comportamento JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS avaliacao_veterinaria JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS data_avaliacao DATE;

COMMENT ON COLUMN cavalos.avaliacao_marcha IS 'Armazena qualidade do passo, comprimento, velocidade e qtde de passos';
COMMENT ON COLUMN cavalos.avaliacao_comportamento IS 'Armazena reações a animais, materiais, montar, movimento cavaleiro, guia, manejo e ambiente';
COMMENT ON COLUMN cavalos.avaliacao_veterinaria IS 'Armazena indicações e contra-indicações';
