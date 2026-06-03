import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEMP_PASSWORD = "Tordilha@2026";
const PROTECTED_EMAIL = "leonardo.informatica@gmail.com";

async function resolveUserId(
  supabase: any,
  userId?: string,
  email?: string
): Promise<{ id: string; email: string }> {
  if (userId) {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) throw new Error('Usuário não encontrado pelo ID informado');
    return { id: data.user.id, email: data.user.email };
  }
  if (email) {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const found = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) throw new Error(`Usuário com email ${email} não encontrado`);
    return { id: found.id, email: found.email };
  }
  throw new Error('Forneça userId ou email');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ============ AUTORIZAÇÃO: quem chama precisa ser gestor/admin ============
    // Antes, esta função usava service-role sem checar o chamador — qualquer
    // usuário logado podia criar gestores / resetar senhas. Mesmo padrão do
    // decidir-solicitacao: valida o JWT do chamador e confere o papel.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    // IMPORTANTE: validar o JWT do chamador passando o token explicitamente.
    // getUser() sem argumento procura sessão no storage (vazio no servidor) e
    // falharia ("Sessão inválida") mesmo pra gestor legítimo.
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: callerErr } = await authClient.auth.getUser(token);
    if (callerErr || !caller) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    const { data: callerRole } = await authClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle();
    const isGestor = !!callerRole && ['gestor', 'admin'].includes(callerRole.role);
    const isSuper = (caller.email ?? '').toLowerCase() === PROTECTED_EMAIL.toLowerCase();
    if (!isGestor && !isSuper) {
      return new Response(
        JSON.stringify({ error: 'Apenas o gestor pode gerenciar usuários' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { action, userId, email, fullName, role } = await req.json();

    // ============ DELETE ============
    if (action === 'delete') {
      // Tolerante: auth user pode não existir (caso de responsavel seedado direto
      // em public.responsaveis sem signup). Cleanup separado pra cada tabela.
      let authUserId: string | null = null;
      let authEmail: string | null = null;

      if (userId) {
        const { data } = await supabaseClient.auth.admin.getUserById(userId);
        if (data?.user) {
          authUserId = data.user.id;
          authEmail = data.user.email ?? null;
        }
      } else if (email) {
        const { data: { users } } = await supabaseClient.auth.admin.listUsers();
        const found = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) {
          authUserId = found.id;
          authEmail = found.email ?? null;
        }
      }

      const effectiveEmail = (authEmail ?? email ?? '').toLowerCase();
      if (effectiveEmail === PROTECTED_EMAIL) {
        throw new Error("Este usuário é um Super Admin e não pode ser excluído.");
      }

      // Cleanup responsavel-side. FK aluno_responsavel.responsavel_id é CASCADE,
      // então os links com alunos somem automaticamente.
      let respDeleted = false;
      if (effectiveEmail) {
        const { data: existing } = await supabaseClient
          .from('responsaveis')
          .select('id')
          .eq('email', effectiveEmail)
          .maybeSingle();
        if (existing?.id) {
          await supabaseClient.from('responsaveis').delete().eq('id', existing.id);
          respDeleted = true;
        }
      }

      // Cleanup auth-side (só se auth user existir).
      let authDeleted = false;
      if (authUserId) {
        await supabaseClient.from('user_roles').delete().eq('user_id', authUserId);
        await supabaseClient.from('profiles').delete().eq('id', authUserId);
        await supabaseClient.auth.admin.deleteUser(authUserId);
        authDeleted = true;
      }

      if (!respDeleted && !authDeleted) {
        throw new Error('Usuário não encontrado em nenhuma tabela');
      }

      return new Response(
        JSON.stringify({ message: 'Usuário removido', respDeleted, authDeleted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ RESET PASSWORD ============
    if (action === 'reset-password') {
      const { id: targetId, email: targetEmail } = await resolveUserId(supabaseClient, userId, email);
      if (targetEmail?.toLowerCase() === PROTECTED_EMAIL) {
        throw new Error("Este usuário é um Super Admin e não pode ter a senha resetada por esta via.");
      }
      const { data: { user: current } } = await supabaseClient.auth.admin.getUserById(targetId);
      await supabaseClient.auth.admin.updateUserById(targetId, {
        password: TEMP_PASSWORD,
        user_metadata: { ...(current?.user_metadata ?? {}), needs_password_change: true }
      });
      return new Response(
        JSON.stringify({ message: 'Senha resetada', tempPassword: TEMP_PASSWORD }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ CREATE ============
    if (action === 'create') {
      if (!email || !role) throw new Error('E-mail e Cargo são obrigatórios');

      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email: email,
        password: TEMP_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: role,
          needs_password_change: true
        }
      });

      if (createError) {
        if (createError.message.includes('already been registered')) {
          // Bloqueia em vez de re-invitar. Vide design 2026-05-11.
          throw new Error("Este e-mail já tem cadastro. Use 'Resetar senha' do usuário existente.");
        }
        throw createError;
      }

      const targetId = newUser.user.id;
      await supabaseClient.from('profiles').upsert({ id: targetId, full_name: fullName, email });
      await supabaseClient.from('user_roles').upsert({ user_id: targetId, role }, { onConflict: 'user_id' });

      /* Desativado em 2026-05-11 — fluxo migrado pra gestor gerencia senhas (sem email).
         Pra religar: descomentar este bloco inteiro e o `resendStatus` no JSON de resposta.
         RESEND_API_KEY no Supabase pode permanecer ou ser removida.

      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      let resendStatus = "Resend API Key not found";
      if (resendApiKey) {
        try {
          const emailHtml = `
            <div style="font-family: sans-serif; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <div style="background-color: #4E593F; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Bem-vindo à Tordilha!</h1>
              </div>
              <div style="padding: 32px;">
                <p style="font-size: 16px; line-height: 1.6;">Olá, <strong>${fullName || 'Colaborador'}</strong>!</p>
                <p style="font-size: 16px; line-height: 1.6;">Seu acesso ao App da Estância Tordilha como <strong>${role}</strong> foi liberado.</p>
                <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b; font-weight: bold; text-transform: uppercase;">Sua Senha Temporária</p>
                  <code style="font-size: 24px; color: #4E593F; font-weight: bold;">${TEMP_PASSWORD}</code>
                </div>
                <p style="font-size: 14px; color: #64748b;">Ao entrar pela primeira vez, o app pedirá para você criar sua própria senha definitiva.</p>
                <div style="text-align: center; margin-top: 32px;">
                  <a href="https://estancia-tordilha.vercel.app" style="background-color: #4E593F; color: white; padding: 16px 32px; border-radius: 100px; text-decoration: none; font-weight: bold; display: inline-block;">Acessar o App</a>
                </div>
              </div>
            </div>
          `;
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Tordilha App <onboarding@resend.dev>',
              to: [email],
              subject: 'Bem-vindo ao App Estância Tordilha!',
              html: emailHtml,
            }),
          });
          const resendData = await resendResponse.json();
          resendStatus = resendResponse.ok ? "Sent" : `Error: ${JSON.stringify(resendData)}`;
        } catch (e) {
          resendStatus = `Critical Error: ${e.message}`;
        }
      }
      */

      return new Response(
        JSON.stringify({
          message: 'Usuário criado com sucesso!',
          tempPassword: TEMP_PASSWORD,
          isExisting: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Action inválida: ${action}. Esperado: 'create' | 'delete' | 'reset-password'`);

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
