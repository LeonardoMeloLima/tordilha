import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const { action, userId, email, fullName, role } = await req.json();

    const TEMP_PASSWORD = "Tordilha@2026";

    // AÇÃO: EXCLUIR USUÁRIO
    if (action === 'delete') {
      if (!userId) throw new Error('ID do usuário é obrigatório');
      const { data: { user: userToProtect } } = await supabaseClient.auth.admin.getUserById(userId);
      if (userToProtect?.email?.toLowerCase() === "leonardo.informatica@gmail.com") {
        throw new Error("Este usuário é um Super Admin e não pode ser excluído.");
      }
      await supabaseClient.from('user_roles').delete().eq('user_id', userId);
      await supabaseClient.from('profiles').delete().eq('id', userId);
      await supabaseClient.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ message: 'Usuário removido' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // AÇÃO: CRIAR USUÁRIO
    if (!email || !role) throw new Error('E-mail e Cargo são obrigatórios');

    let targetId: string;
    let isExisting = false;

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
        const { data: { users } } = await supabaseClient.auth.admin.listUsers();
        const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (existingUser) {
          targetId = existingUser.id;
          isExisting = true;
          // Garantir que os metadados também sejam marcados para troca de senha no re-convite
          await supabaseClient.auth.admin.updateUserById(targetId, {
            user_metadata: { ...existingUser.user_metadata, role: role, needs_password_change: true }
          });
        } else {
          throw createError;
        }
      } else {
        throw createError;
      }
    } else {
      targetId = newUser.user.id;
    }

    // Linkar no banco (Profiles e Roles)
    await supabaseClient.from('profiles').upsert({ id: targetId, full_name: fullName, email });
    await supabaseClient.from('user_roles').upsert({ user_id: targetId, role }, { onConflict: 'user_id' });

    // DISPARAR E-MAIL VIA RESEND
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
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
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

    return new Response(JSON.stringify({ 
      message: isExisting ? 'Cargo atualizado e e-mail enviado.' : 'Usuário criado com sucesso!',
      resendStatus,
      isExisting
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});
