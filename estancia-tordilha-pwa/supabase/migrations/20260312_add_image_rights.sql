-- Migration to add image rights authorization fields to alunos and responsaveis tables

-- 1. Add fields to responsaveis table for legal documentation
ALTER TABLE public.responsaveis 
ADD COLUMN IF NOT EXISTS rg TEXT,
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT;

-- 2. Add fields to alunos table to store the specific authorization status
ALTER TABLE public.alunos
ADD COLUMN IF NOT EXISTS autoriza_imagem BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_autorizacao_imagem TIMESTAMPTZ;

-- 3. Comment on columns for clarity
COMMENT ON COLUMN public.responsaveis.rg IS 'RG do responsável para fins de autorização de imagem';
COMMENT ON COLUMN public.responsaveis.endereco IS 'Endereço residencial do responsável';
COMMENT ON COLUMN public.responsaveis.cidade IS 'Cidade de residência do responsável';
COMMENT ON COLUMN public.responsaveis.estado IS 'Estado (UF) de residência do responsável';

COMMENT ON COLUMN public.alunos.autoriza_imagem IS 'Indica se o responsável autorizou o uso de imagem do aluno';
COMMENT ON COLUMN public.alunos.data_autorizacao_imagem IS 'Data e hora em que a autorização de imagem foi concedida';
