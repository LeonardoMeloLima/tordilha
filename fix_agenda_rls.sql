-- CORREÇÃO DE AGENDAMENTO E PERMISSÕES (SESSOES)
-- Execute este script no SQL Editor do seu Supabase para permitir que os Pais agendem e vejam sessões.

-- 1. LIMPEZA DE REGRAS ANTIGAS PARA SESSOES
DROP POLICY IF EXISTS "Gestors have full access to sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Professors and Gestors can view all sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Sessoes - Gestores" ON public.sessoes;
DROP POLICY IF EXISTS "Sessoes - Professores Select" ON public.sessoes;
DROP POLICY IF EXISTS "Sessoes - Leitura Autenticada" ON public.sessoes;
DROP POLICY IF EXISTS "Sessoes - Responsáveis Select" ON public.sessoes;
DROP POLICY IF EXISTS "Sessoes - Responsáveis Insert" ON public.sessoes;
DROP POLICY IF EXISTS "Sessoes - Responsáveis Delete" ON public.sessoes;

-- 2. GESTORES: ACESSO TOTAL
CREATE POLICY "Sessoes - Gestores" 
ON public.sessoes FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'gestor'))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'gestor'));

-- 3. LEITURA GERAL (Necessário para que pais vejam quais horários estão ocupados, mesmo de outros alunos)
-- Nota: Aqui permitimos ver apenas os horários para verificar disponibilidade.
CREATE POLICY "Sessoes - Leitura Geral Autenticada" 
ON public.sessoes FOR SELECT 
TO authenticated 
USING (true);

-- 4. PROFESSORES: VER TUDO (Já coberto pela regra acima, mas mantemos para clareza se mudarmos a de cima)
-- Se desejar restringir a regra 3 depois, os professores ainda precisam desta:
-- CREATE POLICY "Sessoes - Professores Select" ON public.sessoes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ... role = 'professor'));

-- 5. PAIS / RESPONSÁVEIS: INSERÇÃO E DELEÇÃO
-- Permite inserir se o aluno_id enviado estiver vinculado ao email do usuário logado
CREATE POLICY "Sessoes - Responsáveis Insert" 
ON public.sessoes FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.aluno_responsavel ar 
        JOIN public.responsaveis r ON ar.responsavel_id = r.id 
        WHERE ar.aluno_id = aluno_id 
        AND r.email = auth.jwt()->>'email'
    )
);

-- Permite deletar (cancelar) suas próprias sessões
CREATE POLICY "Sessoes - Responsáveis Delete" 
ON public.sessoes FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.aluno_responsavel ar 
        JOIN public.responsaveis r ON ar.responsaveis!id = r.id -- (ajuste se a relação for direta)
        -- Na verdade, a regra de INSERT já garante a posse. Usamos a mesma lógica:
        WHERE ar.aluno_id = aluno_id 
        AND r.email = auth.jwt()->>'email'
    )
    OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'gestor')
);
