-- FUNÇÕES DE ESTATÍSTICA - Estância Tordilha
-- Execute estas funções no SQL Editor do seu Supabase para corrigir os dashboards 1 e 3.

-- 1. Função para buscar a evolução clínica recente de cada aluno
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
    ma.data_hora as ultima_sessao_data
  FROM public.alunos a
  LEFT JOIN metricas_atuais ma ON a.id = ma.aluno_id
  LEFT JOIN metricas_anteriores mprev ON a.id = mprev.aluno_id
  WHERE a.ativo = true
  ORDER BY a.nome;
END;
$function$;

-- 2. Função para o KPI de Evolução Global
CREATE OR REPLACE FUNCTION public.get_kpi_evolucao_global()
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
AS $function$
DECLARE
  v_global numeric;
BEGIN
  SELECT AVG(evolucao_percentual)
  FROM public.get_evolucao_clinica_recente()
  INTO v_global;
  
  RETURN ROUND(COALESCE(v_global, 0), 2);
END;
$function$;

-- 3. Função para o Relatório de Professores (caso seja necessário em outras telas)
CREATE OR REPLACE FUNCTION public.get_relatorio_professores()
 RETURNS TABLE(
   professor_id uuid,
   nome_professor text,
   total_sessoes bigint,
   total_alunos_unicos bigint
 )
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as professor_id,
    p.full_name as nome_professor,
    COUNT(s.id)::bigint as total_sessoes,
    COUNT(DISTINCT s.aluno_id)::bigint as total_alunos_unicos
  FROM public.profiles p
  LEFT JOIN public.sessoes s ON p.id = s.professor_id
  JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'professor'
  GROUP BY p.id, p.full_name
  ORDER BY total_sessoes DESC;
END;
$function$;
