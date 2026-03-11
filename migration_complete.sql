
-- SUPABASE MIGRATION SCRIPT - Estancia Tordilha
-- Old Project: eaqygkoavgznajegpqca -> New Project: ojkvbejaqryjmvevazpj

-- 1. CLEANUP (Optional - Use with caution)
-- DROP SCHEMA IF EXISTS public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;

-- 2. TABLES & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES 
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY,
    full_name text,
    avatar_url text,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'gestor'::text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alunos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    idade integer,
    diagnostico text,
    contato_emergencia text,
    lgpd_assinado boolean DEFAULT false,
    avatar_url text,
    criado_em timestamptz DEFAULT now(),
    atualizado_em timestamptz DEFAULT now(),
    arquivado boolean DEFAULT false,
    ativo boolean DEFAULT true,
    professor_id uuid REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.cavalos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    foto_url text,
    cor text,
    raca text,
    status text DEFAULT 'ativo'::text,
    criado_em timestamptz DEFAULT now(),
    atualizado_em timestamptz DEFAULT now(),
    humor text DEFAULT 'Dócil'::text,
    comentario text
);

CREATE TABLE IF NOT EXISTS public.sessoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id uuid REFERENCES public.alunos(id),
    cavalo_id uuid REFERENCES public.cavalos(id),
    professor_id uuid REFERENCES public.profiles(id),
    data_hora timestamptz NOT NULL,
    status text DEFAULT 'agendada'::text,
    notas text,
    criado_em timestamptz DEFAULT now(),
    atualizado_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evolucao_sessoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id uuid NOT NULL REFERENCES public.sessoes(id) ON DELETE CASCADE,
    comportamento_escala integer CHECK (comportamento_escala >= 1 AND comportamento_escala <= 5),
    interacao_escala integer CHECK (interacao_escala >= 1 AND interacao_escala <= 5),
    cognitivo integer,
    pedagogico integer,
    social integer,
    emocional integer,
    agitacao integer,
    interacao integer,
    observacoes text,
    fotos_urls text[],
    criado_em timestamptz DEFAULT now(),
    atualizado_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.responsaveis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    telefone text,
    email text,
    cpf text UNIQUE,
    criado_em timestamptz DEFAULT now(),
    atualizado_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aluno_responsavel (
    aluno_id uuid REFERENCES public.alunos(id) ON DELETE CASCADE,
    responsavel_id uuid REFERENCES public.responsaveis(id) ON DELETE CASCADE,
    parentesco text,
    PRIMARY KEY (aluno_id, responsavel_id)
);

CREATE TABLE IF NOT EXISTS public.avisos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo text NOT NULL,
    mensagem text NOT NULL,
    data date NOT NULL DEFAULT CURRENT_DATE,
    tipo text NOT NULL CHECK (tipo = ANY (ARRAY['alerta'::text, 'evento'::text, 'info'::text])),
    target_role text DEFAULT 'geral'::text,
    criado_em timestamptz DEFAULT now(),
    atualizado_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mural_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    aluno_id uuid REFERENCES public.alunos(id),
    sessao_id uuid REFERENCES public.sessoes(id),
    tipo text NOT NULL CHECK (tipo = ANY (ARRAY['foto'::text, 'conquista'::text, 'texto'::text])),
    descricao text NOT NULL,
    data date NOT NULL DEFAULT CURRENT_DATE,
    badge text,
    media_url text,
    criado_em timestamptz DEFAULT now(),
    atualizado_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mural_comentarios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.mural_posts(id) ON DELETE CASCADE,
    user_id uuid,
    conteudo text NOT NULL,
    criado_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mural_likes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.mural_posts(id) ON DELETE CASCADE,
    user_id uuid,
    criado_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notificacoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    titulo text NOT NULL,
    mensagem text NOT NULL,
    lida boolean DEFAULT false,
    link text,
    tipo text,
    target_role text,
    criado_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aluno_conquistas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id uuid REFERENCES public.alunos(id) ON DELETE CASCADE,
    titulo text NOT NULL,
    descricao text,
    conquistado_em timestamptz DEFAULT now()
);

-- 3. DATA INSERTIONS

-- PROFILES
INSERT INTO public.profiles (id, full_name, avatar_url, updated_at) VALUES 
('c164218e-ef4d-4385-bca1-e789ea7af7c8', 'Suporte CFTV', NULL, '2026-03-07 01:13:35.838401+00'),
('64da64bb-03f7-4767-95bc-3edbf78787f1', 'Prof. Leonardo', NULL, '2026-03-07 01:12:49.467277+00'),
('cc9579fb-d81a-4447-9671-cb64428378f1', 'Visitante', NULL, '2026-03-07 20:29:13.459729+00')
ON CONFLICT (id) DO NOTHING;

-- USER_ROLES
INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES 
('05a73b9b-1935-43d5-a896-7bd8b85519bf', 'cc9579fb-d81a-4447-9671-cb64428378f1', 'gestor', '2026-03-06 23:12:53.303774+00'),
('f45fa09e-efdf-4720-9f51-2aa87de01c33', '64da64bb-03f7-4767-95bc-3edbf78787f1', 'professor', '2026-03-07 01:24:58.36836+00'),
('cd19ac0b-affc-40f3-a1ec-34da7a3f33ec', 'c164218e-ef4d-4385-bca1-e789ea7af7c8', 'professor', '2026-03-07 01:24:58.36836+00')
ON CONFLICT (id) DO NOTHING;

-- ALUNOS
INSERT INTO public.alunos (id, nome, idade, diagnostico, contato_emergencia, lgpd_assinado, avatar_url, criado_em, atualizado_em, arquivado, ativo, professor_id) VALUES 
('55555555-5555-4555-a555-555555555555', 'Lucas Silva', 8, 'TEA - Nível 1', '(51) 99123-4567', true, 'https://picsum.photos/seed/student1/200', '2026-03-06 05:58:34.240051+00', '2026-03-06 05:58:34.240051+00', false, true, NULL),
('66666666-6666-4666-a666-666666666666', 'Maria Fernanda', 6, 'Síndrome de Down', '(51) 99234-5678', true, 'https://picsum.photos/seed/student2/200', '2026-03-06 05:58:34.240051+00', '2026-03-06 05:58:34.240051+00', false, true, NULL),
('7437bde2-9fa6-4128-bfcf-394053eb6441', 'Leonardo Melo', 15, 'TDAH', '21990876838', true, 'https://eaqygkoavgznajegpqca.supabase.co/storage/v1/object/public/alunos/cc9579fb-d81a-4447-9671-cb64428378f1_1772842383418.jpeg', '2026-03-07 00:13:10.509254+00', '2026-03-07 00:13:10.509254+00', false, true, NULL),
('88888888-8888-4888-a888-888888888888', 'Ana Beatriz', 7, 'Paralisia Cerebral', '(51) 99456-7890', true, 'https://picsum.photos/seed/student4/200', '2026-03-06 05:58:34.240051+00', '2026-03-06 05:58:34.240051+00', false, false, NULL),
('77777777-7777-4777-a777-777777777777', 'João Pedro', 10, 'TDAH', '(51) 99345-6789', true, 'https://picsum.photos/seed/student3/200', '2026-03-06 05:58:34.240051+00', '2026-03-06 05:58:34.240051+00', false, true, NULL)
ON CONFLICT (id) DO NOTHING;

-- CAVALOS
INSERT INTO public.cavalos (id, nome, foto_url, cor, raca, status, criado_em, atualizado_em, humor, comentario) VALUES 
('33333333-3333-4333-a333-333333333333', 'Tordilho', 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a', 'Cinza', 'Crioulo', 'ativo', '2026-03-06 05:58:34.240051+00', '2026-03-06 05:58:34.240051+00', 'Dócil', NULL),
('11111111-1111-4111-a111-111111111111', 'Alazão', 'https://eaqygkoavgznajegpqca.supabase.co/storage/v1/object/public/cavalos/cc9579fb-d81a-4447-9671-cb64428378f1_1772842918215.jpg', 'Marrom', 'Mangalarga', 'Repouso', '2026-03-06 05:58:34.240051+00', '2026-03-06 05:58:34.240051+00', 'Dócil', NULL),
('44444444-4444-4444-a444-444444444444', 'Chocolate', 'https://eaqygkoavgznajegpqca.supabase.co/storage/v1/object/public/cavalos/cc9579fb-d81a-4447-9671-cb64428378f1_1772843177323.jpg', 'Baio', 'Campolina', 'Repouso', '2026-03-06 05:58:34.240051+00', '2026-03-06 05:58:34.240051+00', 'Dócil', NULL),
('22222222-2222-4222-a222-222222222222', 'Estrela', 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3', 'Preto', 'Quarto de Milha', 'Repouso', '2026-03-06 05:58:34.240051+00', '2026-03-06 05:58:34.240051+00', 'Dócil', NULL),
('951a9ed1-b488-4cb8-92cc-5debd8d10a95', 'Atanásio ', 'https://eaqygkoavgznajegpqca.supabase.co/storage/v1/object/public/cavalos/cc9579fb-d81a-4447-9671-cb64428378f1_1772896938439.jpg', NULL, 'Mangalarga ', 'Ativo', '2026-03-07 15:22:21.79599+00', '2026-03-07 15:22:21.79599+00', 'Dócil', NULL),
('2b6b80a7-f4a3-45e6-bc4e-bd50653c2137', 'Roberval ', 'https://eaqygkoavgznajegpqca.supabase.co/storage/v1/object/public/cavalos/cc9579fb-d81a-4447-9671-cb64428378f1_1772842424954.png', NULL, 'Mangalarga ', 'Inativo', '2026-03-07 00:13:48.435652+00', '2026-03-07 00:13:48.435652+00', 'Dócil', NULL)
ON CONFLICT (id) DO NOTHING;

-- SESSOES
INSERT INTO public.sessoes (id, aluno_id, cavalo_id, professor_id, data_hora, status, notas, criado_em, atualizado_em) VALUES 
('d97c0264-d8c3-4d5c-9caa-0228f328ef2e', '55555555-5555-4555-a555-555555555555', '22222222-2222-4222-a222-222222222222', NULL, '2026-03-06 08:00:00+00', 'confirmada', NULL, '2026-03-06 23:15:10.513409+00', '2026-03-06 23:15:10.513409+00'),
('9975ede1-04a8-4b15-85a1-ea8d1871bd43', '55555555-5555-4555-a555-555555555555', '22222222-2222-4222-a222-222222222222', NULL, '2026-03-06 08:00:00+00', 'confirmada', NULL, '2026-03-06 23:18:23.540962+00', '2026-03-06 23:18:23.540962+00'),
('bb0e63a8-5d5a-44dc-82a6-13b92defc41e', '66666666-6666-4666-a666-666666666666', '22222222-2222-4222-a222-222222222222', NULL, '2026-03-06 10:00:00+00', 'confirmada', NULL, '2026-03-06 23:30:35.96016+00', '2026-03-06 23:30:35.96016+00'),
('ec629d65-e946-43a8-8fb7-ddbff6c3a209', '66666666-6666-4666-a666-666666666666', '44444444-4444-4444-a444-444444444444', NULL, '2026-03-07 17:00:00+00', 'confirmada', NULL, '2026-03-07 15:04:32.873754+00', '2026-03-07 15:04:32.873754+00'),
('9cd0b5e2-3005-47fb-b21a-cd29eab46322', '66666666-6666-4666-a666-666666666666', '33333333-3333-4333-a333-333333333333', NULL, '2026-03-09 11:00:00+00', 'confirmada', NULL, '2026-03-07 15:22:55.567409+00', '2026-03-07 15:22:55.567409+00'),
('b11f41d8-dfa6-4c38-9f93-5b90185c2df5', '77777777-7777-4777-a777-777777777777', '22222222-2222-4222-a222-222222222222', NULL, '2026-03-10 12:00:00+00', 'confirmada', NULL, '2026-03-07 15:23:07.254203+00', '2026-03-07 15:23:07.254203+00'),
('179ab731-c66a-411f-8b98-c64b67e123a2', '7437bde2-9fa6-4128-bfcf-394053eb6441', '22222222-2222-4222-a222-222222222222', NULL, '2026-03-08 09:00:00+00', 'confirmada', NULL, '2026-03-07 20:21:46.723048+00', '2026-03-07 20:21:46.723048+00'),
('426ec8bc-f3fe-4b2a-af7d-5ea06f3199f7', '55555555-5555-4555-a555-555555555555', '951a9ed1-b488-4cb8-92cc-5debd8d10a95', NULL, '2026-03-11 10:00:00+00', 'confirmada', NULL, '2026-03-07 20:22:42.008671+00', '2026-03-07 20:22:42.008671+00'),
('fc54a385-e9ef-4812-a658-0cd2a2bffda0', '7437bde2-9fa6-4128-bfcf-394053eb6441', '951a9ed1-b488-4cb8-92cc-5debd8d10a95', NULL, '2026-03-07 15:01:00+00', 'confirmada', NULL, '2026-03-07 22:26:50.170144+00', '2026-03-07 22:26:50.170144+00')
ON CONFLICT (id) DO NOTHING;

-- EVOLUCAO_SESSOES
INSERT INTO public.evolucao_sessoes (id, sessao_id, cognitivo, pedagogico, social, emocional, agitacao, interacao, observacoes, fotos_urls, criado_em, atualizado_em) VALUES 
('736b17db-cf1d-4e2e-9bdd-7810a7b6d544', '9975ede1-04a8-4b15-85a1-ea8d1871bd43', 4, 3, 2, 1, 5, 3, '', NULL, '2026-03-07 03:57:05.760983+00', '2026-03-07 03:57:05.760983+00')
ON CONFLICT (id) DO NOTHING;

-- RESPONSAVEIS
INSERT INTO public.responsaveis (id, nome, telefone, email, cpf, criado_em, atualizado_em) VALUES 
('99999999-9999-4999-a999-999999999999', 'Ricardo Ferreira', '(51) 99555-1234', 'ricardo@email.com', '123.456.789-00', '2026-03-06 05:58:34.240051+00', '2026-03-06 05:58:34.240051+00'),
('2fae73d1-1e65-4cf1-bd41-7095c5da4566', 'Leonardo', NULL, 'leonardo.informatica@gmail.com', NULL, '2026-03-07 18:57:54.957509+00', '2026-03-07 18:57:54.957509+00')
ON CONFLICT (id) DO NOTHING;

-- ALUNO_RESPONSAVEL
INSERT INTO public.aluno_responsavel (aluno_id, responsavel_id, parentesco) VALUES 
('55555555-5555-4555-a555-555555555555', '99999999-9999-4999-a999-999999999999', 'Pai'),
('7437bde2-9fa6-4128-bfcf-394053eb6441', '2fae73d1-1e65-4cf1-bd41-7095c5da4566', 'Pai')
ON CONFLICT (aluno_id, responsavel_id) DO NOTHING;

-- AVISOS
INSERT INTO public.avisos (id, titulo, mensagem, data, tipo, target_role, criado_em, atualizado_em) VALUES 
('88ab9510-044f-4e74-9e70-8fa15b9c1bd0', 'Sessão cancelada', 'Sessão de quinta-feira cancelada devido à chuva forte prevista.', '2026-03-04', 'alerta', 'geral', '2026-03-06 19:24:58.280631+00', '2026-03-06 19:24:58.280631+00'),
('b655c9dc-e493-4976-a708-47de50cae712', 'Festa Junina 🎉', 'Venham comemorar! Dia 15/03, a partir das 14h, teremos nossa Festa Junina na sede.', '2026-03-03', 'evento', 'geral', '2026-03-06 19:24:58.280631+00', '2026-03-06 19:24:58.280631+00'),
('7e2db9ae-fcd7-4bee-b12f-53c77c3a2384', 'Novo horário', 'A partir de abril, as sessões matutinas começarão às 07:30.', '2026-03-01', 'info', 'geral', '2026-03-06 19:24:58.280631+00', '2026-03-06 19:24:58.280631+00'),
('b93c3db7-b1f2-49cc-b1d1-0ce79efd7b7b', 'Reunião ', 'Venham para a reunião ', '2026-03-08', 'alerta', 'professor', '2026-03-08 01:13:24.31296+00', '2026-03-08 01:13:24.31296+00'),
('5518e022-d209-45d3-8fb9-e2a310a473bb', 'Teste', 'Teste', '2026-03-08', 'alerta', 'professor', '2026-03-08 01:31:11.827889+00', '2026-03-08 01:31:11.827889+00'),
('ad3576e0-4c45-4f41-9e59-d126313004ab', 'Festa ', 'Festa', '2026-03-08', 'evento', 'pais', '2026-03-08 01:52:44.233059+00', '2026-03-08 01:52:44.233059+00'),
('16d86aed-397b-4ef7-b260-fac64eccbe7d', 'Reunião ', 'Reunião ', '2026-03-08', 'alerta', 'professor', '2026-03-08 01:53:21.500485+00', '2026-03-08 01:53:21.500485+00')
ON CONFLICT (id) DO NOTHING;

-- MURAL_POSTS
INSERT INTO public.mural_posts (id, tipo, descricao, data, badge, media_url, criado_em, atualizado_em, aluno_id, sessao_id, user_id) VALUES 
('b4aa6756-6716-4a4c-9daa-00220d8ebe75', 'foto', 'Lucas montando Tordilho pela primeira vez sozinho! 🐴', '2026-03-04', NULL, NULL, '2026-03-06 19:24:58.280631+00', '2026-03-06 19:24:58.280631+00', NULL, NULL, NULL),
('1022b076-a362-4016-bb38-70db17c4846d', 'conquista', 'Maria Fernanda ganhou o selo ''Amiga do Tordilho''!', '2026-03-03', 'Amiga do Tordilho', NULL, '2026-03-06 19:24:58.280631+00', '2026-03-06 19:24:58.280631+00', NULL, NULL, NULL),
('6fbeb046-ee6b-4a8b-9ca8-1ccfa3ea78b1', 'foto', 'Tarde especial de integração no campo.', '2026-03-02', NULL, NULL, '2026-03-06 19:24:58.280631+00', '2026-03-06 19:24:58.280631+00', NULL, NULL, NULL),
('1ede752c-6706-4cc1-861a-46c4d16e86fb', 'foto', 'Leonardo Melo em sua aula do dia 07/03/2026 com o Roberval ! 🐴✨', '2026-03-07', 'Superação', 'https://eaqygkoavgznajegpqca.supabase.co/storage/v1/object/public/mural/cc9579fb-d81a-4447-9671-cb64428378f1_1772914403744.jpg', '2026-03-07 20:13:28.765532+00', '2026-03-07 20:13:28.765532+00', '7437bde2-9fa6-4128-bfcf-394053eb6441', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- MURAL_COMENTARIOS
INSERT INTO public.mural_comentarios (id, post_id, user_id, conteudo, criado_em) VALUES 
('79f095bb-7222-43e4-b32d-06aca281796f', '1022b076-a362-4016-bb38-70db17c4846d', 'cc9579fb-d81a-4447-9671-cb64428378f1', 'Lindo ', '2026-03-07 19:58:22.903735+00'),
('df19e4de-01a9-49ac-ad5d-ab177650585c', '1ede752c-6706-4cc1-861a-46c4d16e86fb', 'cc9579fb-d81a-4447-9671-cb64428378f1', 'Olá ', '2026-03-07 20:13:50.368728+00'),
('cf7dc1c9-b10e-4c9a-82bb-e57d7911cff4', '1ede752c-6706-4cc1-861a-46c4d16e86fb', 'cc9579fb-d81a-4447-9671-cb64428378f1', 'Olá ', '2026-03-07 20:27:15.95499+00')
ON CONFLICT (id) DO NOTHING;

-- MURAL_LIKES
INSERT INTO public.mural_likes (id, post_id, user_id, criado_em) VALUES 
('c412656e-79a6-48a3-a7bb-c5630d63a45d', '6fbeb046-ee6b-4a8b-9ca8-1ccfa3ea78b1', 'cc9579fb-d81a-4447-9671-cb64428378f1', '2026-03-07 19:48:37.825357+00'),
('dafcbf65-308a-4b28-a33a-72661c73c975', '1022b076-a362-4016-bb38-70db17c4846d', 'cc9579fb-d81a-4447-9671-cb64428378f1', '2026-03-07 19:58:17.669452+00'),
('1b2c6ee0-4ae3-42f1-b5d8-5bb81df8e7d1', '1ede752c-6706-4cc1-861a-46c4d16e86fb', 'cc9579fb-d81a-4447-9671-cb64428378f1', '2026-03-07 20:13:42.941934+00')
ON CONFLICT (id) DO NOTHING;

-- NOTIFICACOES
INSERT INTO public.notificacoes (id, user_id, titulo, message, lida, link, tipo, target_role, criado_em) VALUES 
('796f9422-be92-4f1d-b4b4-71f10bb5230e', '64da64bb-03f7-4767-95bc-3edbf78787f1', 'Reunião ', 'Venham para a reunião ', false, NULL, 'alerta', NULL, '2026-03-08 01:13:24.31296+00'),
('bc6c61f5-b3a9-411c-b19f-f39e38dd42db', 'c164218e-ef4d-4385-bca1-e789ea7af7c8', 'Reunião ', 'Venham para a reunião ', false, NULL, 'alerta', NULL, '2026-03-08 01:13:24.31296+00'),
('2777bec9-36bb-4984-93e3-98b83fec6907', '64da64bb-03f7-4767-95bc-3edbf78787f1', 'Teste', 'Teste', false, NULL, 'alerta', NULL, '2026-03-08 01:31:11.827889+00'),
('13ad8387-a38a-4afd-82fb-5afc865a7076', 'c164218e-ef4d-4385-bca1-e789ea7af7c8', 'Teste', 'Teste', false, NULL, 'alerta', NULL, '2026-03-08 01:31:11.827889+00'),
('2eff615e-68a9-4fae-ba92-40d58967f11f', 'cc9579fb-d81a-4447-9671-cb64428378f1', 'Teste', 'Teste', true, NULL, 'alerta', NULL, '2026-03-08 01:31:11.827889+00'),
('c0497b07-e767-4549-9b25-4b823348b9c0', 'cc9579fb-d81a-4447-9671-cb64428378f1', 'Festa ', 'Festa', false, NULL, 'evento', 'pais', '2026-03-08 01:52:44.233059+00'),
('230e9341-460b-4e4b-87e2-306fa40786d1', '64da64bb-03f7-4767-95bc-3edbf78787f1', 'Reunião ', 'Reunião ', false, NULL, 'alerta', 'professor', '2026-03-08 01:53:21.500485+00'),
('0e940a51-1820-4673-816f-9417a9201e86', 'c164218e-ef4d-4385-bca1-e789ea7af7c8', 'Reunião ', 'Reunião ', false, NULL, 'alerta', 'professor', '2026-03-08 01:53:21.500485+00'),
('d07f4908-38a6-4f3e-a8ee-0fce554d6f2f', 'cc9579fb-d81a-4447-9671-cb64428378f1', 'Reunião ', 'Reunião ', false, NULL, 'alerta', 'professor', '2026-03-08 01:53:21.500485+00')
ON CONFLICT (id) DO NOTHING;

-- 4. FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_role text;
  v_full_name text;
BEGIN
  v_full_name := COALESCE(
    new.raw_user_meta_data->>'nome_completo',
    new.raw_user_meta_data->>'full_name',
    ''
  );
  
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, v_full_name, new.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
  v_role := new.raw_user_meta_data->>'role';
  IF v_role IS NOT NULL AND v_role IN ('gestor', 'professor', 'pais') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, v_role)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enviar_comunicado(p_titulo text, p_mensagem text, p_tipo text, p_target_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_aviso_id uuid;
  v_user_record RECORD;
  v_sender_id uuid := auth.uid();
BEGIN
  INSERT INTO public.avisos (titulo, mensagem, tipo, target_role, data)
  VALUES (p_titulo, p_mensagem, p_tipo, p_target_role, CURRENT_DATE)
  RETURNING id INTO v_aviso_id;

  FOR v_user_record IN 
    SELECT user_id 
    FROM public.user_roles 
    WHERE (p_target_role = 'geral' OR role = p_target_role)
  LOOP
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, lida, target_role)
    VALUES (v_user_record.user_id, p_titulo, p_mensagem, p_tipo, false, p_target_role);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_sender_id 
    AND (p_target_role = 'geral' OR role = p_target_role)
  ) THEN
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, lida, target_role)
    VALUES (v_sender_id, p_titulo, p_mensagem, p_tipo, false, p_target_role);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.limitar_mural_posts_20()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM public.mural_posts
    WHERE id IN (
        SELECT id FROM (
            SELECT id, row_number() OVER (ORDER BY criado_em DESC) as rn
            FROM public.mural_posts
        ) sub
        WHERE rn > 20
    );
    RETURN NULL;
END;
$function$;

-- TRIGGERS
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER trigger_limitar_mural_posts
  AFTER INSERT ON public.mural_posts
  FOR EACH STATEMENT EXECUTE FUNCTION public.limitar_mural_posts_20();

-- 5. RLS POLICIES
-- user_roles
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow public read access on user_roles" ON public.user_roles FOR SELECT USING (true);

-- cavalos
CREATE POLICY "Allow public read access on cavalos" ON public.cavalos FOR SELECT USING (true);
CREATE POLICY "Gestors can manage cavalos" ON public.cavalos FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'gestor'));

-- alunos
CREATE POLICY "Allow public read access on alunos" ON public.alunos FOR SELECT USING (true);
CREATE POLICY "Gestors can manage alumnos" ON public.alunos FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'gestor'));

-- avisos
CREATE POLICY "Permitir leitura para usuários autenticados" ON public.avisos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestores podem deletar avisos" ON public.avisos FOR DELETE TO authenticated USING (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'gestor'::text);
CREATE POLICY "Gestores podem atualizar avisos" ON public.avisos FOR UPDATE TO authenticated USING (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'gestor'::text) WITH CHECK (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'gestor'::text);

-- sessoes
CREATE POLICY "Gestors have full access to sessoes" ON public.sessoes FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'gestor'));
CREATE POLICY "Professors and Gestors can view all sessoes" ON public.sessoes FOR SELECT TO authenticated USING ((auth.uid() = professor_id) OR (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = ANY (ARRAY['gestor'::text, 'professor'::text]))));

-- profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- mural
CREATE POLICY "Enable read access for all users" ON public.mural_posts FOR SELECT USING (true);
CREATE POLICY "Insert for staff" ON public.mural_posts FOR INSERT TO authenticated WITH CHECK (true);

-- 6. FOREIGN KEYS (Final Polish with auth.users)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.mural_posts ADD CONSTRAINT mural_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.mural_comentarios ADD CONSTRAINT mural_comentarios_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.mural_likes ADD CONSTRAINT mural_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
