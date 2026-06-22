-- Previne atendimentos recorrentes DUPLICADOS (mesmo praticante + dia da semana
-- + horário) entre os registros ATIVOS. Índice parcial: só vale para ativo=true,
-- então o histórico desativado (ex.: troca de cavalo) pode ter "duplicatas"
-- inativas sem conflito.
--
-- Contexto: com a remoção da aprovação da família (terapeuta cria recorrência
-- direto), some o passo intermediário que poderia barrar duplicata. Esta trava
-- de integridade garante no banco que não se cria 2 atendimentos ativos no
-- mesmo slot pro mesmo praticante (caso María Eduarda: Votalla + Luana QUI 16:30).
--
-- ROLLBACK: DROP INDEX IF EXISTS uniq_recorrencia_ativa;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_recorrencia_ativa
  ON public.sessoes_recorrentes (aluno_id, dia_semana, horario)
  WHERE ativo;
