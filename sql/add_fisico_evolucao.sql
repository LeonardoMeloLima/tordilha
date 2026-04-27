-- Adiciona o parâmetro "Físico" às avaliações de evolução clínica.
-- Execute no SQL Editor do Supabase em UMA execução só.

-- 1) Coluna nova (nullable, registros antigos ficam null e aparecem como "—" no app)
ALTER TABLE public.evolucao_sessoes
  ADD COLUMN IF NOT EXISTS fisico smallint
  CHECK (fisico IS NULL OR (fisico >= 0 AND fisico <= 5));

-- 2) Atualiza a função para retornar media_fisico.
--    Mantém o cálculo de evolucao_percentual com divisor 30 (6 parâmetros antigos)
--    para não distorcer histórico — o Físico entra só como dimensão exibida.
--    Precisa DROP antes porque o tipo de retorno mudou (Postgres não aceita
--    CREATE OR REPLACE quando colunas do retorno são adicionadas).
DROP FUNCTION IF EXISTS public.get_evolucao_clinica_recente();

CREATE OR REPLACE FUNCTION public.get_evolucao_clinica_recente()
 RETURNS TABLE(
   aluno_id uuid,
   nome text,
   avatar_url text,
   evolucao_percentual numeric,
   media_cognitivo numeric,
   media_pedagogico numeric,
   media_social numeric,
   media_emocional numeric,
   media_agitacao numeric,
   media_interacao numeric,
   media_fisico numeric,
   ultima_sessao_data timestamptz
 )
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH sessoes_com_evolucao AS (
    SELECT
      s.aluno_id,
      s.data_hora,
      es.id as evolucao_id,
      es.cognitivo,
      es.pedagogico,
      es.social,
      es.emocional,
      es.agitacao,
      es.interacao,
      es.fisico,
      ROW_NUMBER() OVER (PARTITION BY s.aluno_id ORDER BY s.data_hora DESC) as rn
    FROM public.sessoes s
    INNER JOIN public.evolucao_sessoes es ON s.id = es.sessao_id
  ),
  metricas_atuais AS (
    SELECT * FROM sessoes_com_evolucao WHERE rn = 1
  ),
  metricas_anteriores AS (
    SELECT * FROM sessoes_com_evolucao WHERE rn = 2
  )
  SELECT
    a.id as aluno_id,
    a.nome,
    a.avatar_url,
    CASE
      WHEN ma.evolucao_id IS NULL THEN 0
      WHEN mprev.evolucao_id IS NULL THEN
        ROUND(((COALESCE(ma.cognitivo,0) + COALESCE(ma.pedagogico,0) + COALESCE(ma.social,0) + COALESCE(ma.emocional,0) + COALESCE(ma.agitacao,0) + COALESCE(ma.interacao,0))::numeric / 30.0) * 100, 2)
      ELSE
        ROUND((
          (COALESCE(ma.cognitivo,0) + COALESCE(ma.pedagogico,0) + COALESCE(ma.social,0) + COALESCE(ma.emocional,0) + COALESCE(ma.agitacao,0) + COALESCE(ma.interacao,0))::numeric -
          (COALESCE(mprev.cognitivo,0) + COALESCE(mprev.pedagogico,0) + COALESCE(mprev.social,0) + COALESCE(mprev.emocional,0) + COALESCE(mprev.agitacao,0) + COALESCE(mprev.interacao,0))::numeric
        ) / NULLIF((COALESCE(mprev.cognitivo,0) + COALESCE(mprev.pedagogico,0) + COALESCE(mprev.social,0) + COALESCE(mprev.emocional,0) + COALESCE(mprev.agitacao,0) + COALESCE(mprev.interacao,0)), 0)::numeric * 100, 2)
    END as evolucao_percentual,
    COALESCE(ma.cognitivo, 0)::numeric as media_cognitivo,
    COALESCE(ma.pedagogico, 0)::numeric as media_pedagogico,
    COALESCE(ma.social, 0)::numeric as media_social,
    COALESCE(ma.emocional, 0)::numeric as media_emocional,
    COALESCE(ma.agitacao, 0)::numeric as media_agitacao,
    COALESCE(ma.interacao, 0)::numeric as media_interacao,
    ma.fisico::numeric as media_fisico,
    ma.data_hora as ultima_sessao_data
  FROM public.alunos a
  LEFT JOIN metricas_atuais ma ON a.id = ma.aluno_id
  LEFT JOIN metricas_anteriores mprev ON a.id = mprev.aluno_id
  WHERE a.ativo = true
  ORDER BY a.nome;
END;
$function$;
