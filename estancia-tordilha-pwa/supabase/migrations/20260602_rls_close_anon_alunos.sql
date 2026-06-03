-- Fecha leitura ANÔNIMA de alunos (diagnóstico, contato emergência de menores).
-- Authenticated continua lendo via "Leitura de Alunos Autenticada"/gestor/pais.
drop policy if exists "Acesso público alunos" on public.alunos;
-- ROLLBACK: create policy "Acesso público alunos" on public.alunos for select using (true);
