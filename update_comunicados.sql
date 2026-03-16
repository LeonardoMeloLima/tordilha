
-- 1. Garantir que a tabela de avisos está correta (sem constraints impeditivas)
ALTER TABLE public.avisos DROP CONSTRAINT IF EXISTS avisos_target_user_id_fkey;
ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS target_user_id uuid;

-- 2. Limpar todas as versões da função para garantir que a nova assinatura seja a única
DROP FUNCTION IF EXISTS public.enviar_comunicado(text, text, text, text);
DROP FUNCTION IF EXISTS public.enviar_comunicado(text, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.enviar_comunicado(text, text, text, text, text);

-- 3. Recriar a função com a lógica de busca por e-mail (resolvendo ID de responsável vs ID de login)
CREATE OR REPLACE FUNCTION public.enviar_comunicado(
  p_titulo text, 
  p_mensagem text, 
  p_tipo text, 
  p_target_role text, 
  p_target_user_id text DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER -- Importante: permite buscar no esquema auth
 SET search_path TO 'public'
 AS $function$
 DECLARE
   v_aviso_id uuid;
   v_user_record RECORD;
   v_sender_id uuid := auth.uid();
   v_target_uuid uuid; -- O UUID real do usuário de login (UID)
   v_responsavel_id uuid;
   v_target_email text;
 BEGIN
   -- 1. Converter entrada para UUID do responsável
   IF p_target_user_id IS NOT NULL AND p_target_user_id <> '' THEN
     v_responsavel_id := p_target_user_id::uuid;
     
     -- 2. Descobrir o e-mail deste responsável na tabela public.responsaveis
     SELECT email INTO v_target_email FROM public.responsaveis WHERE id = v_responsavel_id;
     
     -- 3. Tentar encontrar o UID do usuário que tem esse e-mail no auth.users
     -- Note: Usamos uma subquery ou busca direta se tivermos permissão
     -- Se não encontrar no auth, v_target_uuid ficará nulo e não enviará notificação (mas salvará aviso)
     BEGIN
        SELECT id INTO v_target_uuid FROM auth.users WHERE email = v_target_email LIMIT 1;
     EXCEPTION WHEN OTHERS THEN
        -- Se falhar o acesso ao auth.users, tentamos usar o ID direto (caso sejam iguais)
        v_target_uuid := v_responsavel_id;
     END;
   END IF;

   -- 4. Inserir o aviso na tabela de histórico (sempre salva, para o Gestor ver o que enviou)
   INSERT INTO public.avisos (titulo, mensagem, tipo, target_role, target_user_id, data)
   VALUES (p_titulo, p_mensagem, p_tipo, p_target_role, v_responsavel_id, CURRENT_DATE)
   RETURNING id INTO v_aviso_id;

   -- 5. Enviar a notificação realtime (se for específico e achamos o usuário)
   IF v_target_uuid IS NOT NULL THEN
     INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, lida)
     VALUES (v_target_uuid, p_titulo, p_mensagem, p_tipo, false);
   ELSE
     -- Se for para um papel (role) ou geral
     IF p_target_role <> 'especifico' THEN
       FOR v_user_record IN 
         SELECT user_id 
         FROM public.user_roles 
         WHERE (p_target_role = 'geral' OR role = p_target_role)
       LOOP
         INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, lida)
         VALUES (v_user_record.user_id, p_titulo, p_mensagem, p_tipo, false);
       END LOOP;
     END IF;
   END IF;

   -- 6. Notificar também o remetente para histórico local
   IF v_sender_id IS NOT NULL AND (v_target_uuid IS NULL OR v_sender_id != v_target_uuid) THEN
     INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, lida)
     VALUES (v_sender_id, p_titulo, p_mensagem, p_tipo, false);
   END IF;
 END;
 $function$;
