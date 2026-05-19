# Eliminar fluxo de email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar toda dependência de email do app (criação de terapeuta/gestor, recuperação de senha, confirmação de signup), substituindo por gestão de credenciais dentro do painel Admin. Senha temporária padrão `Tordilha@2026` exibida na tela com botão "copiar", reset feito pelo gestor.

**Architecture:** Edge function `create-user` ganha router de actions (`create`, `delete`, `reset-password`), aceita `userId` OU `email` como input. Componente `<TempPasswordSuccessModal>` reusável apresenta a senha com botão de copiar tanto no fluxo de criação quanto no de reset. Aba nova "Responsáveis" no `GestorAdminPanel` lista usuários da tabela `responsaveis` (linkados via email). Modal `FirstAccessPasswordPrompt` (renomeado de `ProfessorPasswordPrompt`) força troca obrigatória de senha no primeiro acesso, independente do role.

**Tech Stack:** React 18 + Vite + TypeScript, Supabase (Auth + Postgres + Edge Functions), TanStack Query, Tailwind, shadcn/ui.

**Specs:** [docs/superpowers/specs/2026-05-11-gestor-gerencia-senhas-design.md](../specs/2026-05-11-gestor-gerencia-senhas-design.md)

**Projeto Supabase real:** `ojkvbejaqryjmvevazpj` (na org `vipsifqpebtgzhvrbmby`, dono `suportecftv.rb@gmail.com` — fora da org principal do dev). MCP precisa estar autenticado nessa conta.

**Pre-flight check:** o working tree contém ~9 arquivos modificados de um trabalho anterior do dia (rename Professor→Terapeuta, eye toggle, fix toast/modal). Confirmar com o usuário se devem ser commitados antes ou se ficam pra commitar junto com este plano. **Não usar `git add .` ou `git add -A`** — sempre listar arquivos explicitamente (vide memória `feedback_dirty_working_tree`).

---

## Task 1: Edge function — router + comentar Resend

**Files:**
- Modify: `estancia-tordilha-pwa/supabase/functions/create-user/index.ts`

**Contexto:** A edge function hoje (v20) já retorna `tempPassword` mas (a) ainda chama Resend, (b) não tem action `reset-password`, (c) trata `create` como default em vez de exigir action explícita, (d) na branch "usuário já existe" tenta re-invitar em vez de bloquear. Esta task corrige tudo isso e deploya v21.

- [ ] **Step 1: Ler estado atual da função em produção**

Run via MCP `mcp__plugin_supabase_supabase__get_edge_function` com `project_id=ojkvbejaqryjmvevazpj`, `function_slug=create-user`.
Expected: retorna `version: 20`, content idêntico ao arquivo local `supabase/functions/create-user/index.ts`. Se divergir, sincronizar localmente antes de prosseguir.

- [ ] **Step 2: Reescrever a função inteira com router de actions**

Substituir todo o conteúdo de `estancia-tordilha-pwa/supabase/functions/create-user/index.ts` por:

```ts
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { action, userId, email, fullName, role } = await req.json();

    // ============ DELETE ============
    if (action === 'delete') {
      const { id: targetId, email: targetEmail } = await resolveUserId(supabaseClient, userId, email);
      if (targetEmail?.toLowerCase() === PROTECTED_EMAIL) {
        throw new Error("Este usuário é um Super Admin e não pode ser excluído.");
      }
      await supabaseClient.from('user_roles').delete().eq('user_id', targetId);
      await supabaseClient.from('profiles').delete().eq('id', targetId);
      await supabaseClient.auth.admin.deleteUser(targetId);
      return new Response(
        JSON.stringify({ message: 'Usuário removido' }),
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
```

- [ ] **Step 3: Deploy via MCP**

Chamar `mcp__plugin_supabase_supabase__deploy_edge_function` com:
- `project_id`: `ojkvbejaqryjmvevazpj`
- `name`: `create-user`
- `entrypoint_path`: `index.ts`
- `verify_jwt`: `false` (preservar comportamento atual — vide spec, dívida documentada)
- `files`: array com 1 item `{name: "index.ts", content: <conteúdo do Step 2>}`

Expected: response com `version: 21`, `status: "ACTIVE"`.

- [ ] **Step 4: Smoke test — Action inválida deve retornar erro descritivo**

Run:
```bash
URL=$(grep '^VITE_SUPABASE_URL=' /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa/.env.local | cut -d= -f2- | tr -d '"' | tr -d "'")
ANON=$(grep '^VITE_SUPABASE_ANON_KEY=' /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa/.env.local | cut -d= -f2- | tr -d '"' | tr -d "'")
curl -sS -X POST "$URL/functions/v1/create-user" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  --data '{"action":"bogus"}'
```
Expected: HTTP 400 com `{"error":"Action inválida: bogus. Esperado: 'create' | 'delete' | 'reset-password'"}`.

- [ ] **Step 5: Smoke test — Reset-password de um user de descarte**

Criar primeiro um user de descarte. Run:
```bash
curl -sS -X POST "$URL/functions/v1/create-user" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  --data '{"action":"create","email":"smoke-test-2026-05-11@example.com","fullName":"Smoke Test","role":"professor"}'
```
Expected: `{"message":"Usuário criado com sucesso!","tempPassword":"Tordilha@2026","isExisting":false}`.

Depois resetar:
```bash
curl -sS -X POST "$URL/functions/v1/create-user" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  --data '{"action":"reset-password","email":"smoke-test-2026-05-11@example.com"}'
```
Expected: `{"message":"Senha resetada","tempPassword":"Tordilha@2026"}`.

Por fim, deletar:
```bash
curl -sS -X POST "$URL/functions/v1/create-user" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  --data '{"action":"delete","email":"smoke-test-2026-05-11@example.com"}'
```
Expected: `{"message":"Usuário removido"}`.

- [ ] **Step 6: Smoke test — Re-criar email bloqueado**

Criar um user, tentar criar de novo. Run:
```bash
curl -sS -X POST "$URL/functions/v1/create-user" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  --data '{"action":"create","email":"smoke-test-2026-05-11@example.com","fullName":"Smoke Test","role":"professor"}'
```
Repetir o mesmo comando novamente.
Expected (2ª chamada): HTTP 400 com `{"error":"Este e-mail já tem cadastro. Use 'Resetar senha' do usuário existente."}`.

Limpar: chamar `action: delete` com o email.

- [ ] **Step 7: Commit**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha
git add estancia-tordilha-pwa/supabase/functions/create-user/index.ts
git commit -m "$(cat <<'EOF'
feat(edge): router de actions + reset-password, comenta Resend

Edge function create-user v21:
- action explícita ('create' | 'delete' | 'reset-password')
- reset-password aceita userId OU email (resolve internamente)
- create bloqueia email existente (em vez de re-invitar)
- bloco Resend e template HTML comentados (preservados pra religar)
- super admin protegido contra reset

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: TempPasswordSuccessModal — componente reusável

**Files:**
- Create: `estancia-tordilha-pwa/src/components/gestor/TempPasswordSuccessModal.tsx`

**Contexto:** Modal de sucesso pós-criação e pós-reset. Recebe nome, email e senha temporária. Tem botão "Copiar" e botão "Entendi". Usa o `ActionSheet` do projeto.

- [ ] **Step 1: Criar o arquivo**

Criar `estancia-tordilha-pwa/src/components/gestor/TempPasswordSuccessModal.tsx` com:

```tsx
import { useState } from "react";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { Button } from "@/components/ui/button";
import { Copy, Check, ShieldCheck } from "lucide-react";

interface TempPasswordSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: 'created' | 'reset';
  userName: string;
  email: string;
  tempPassword: string;
}

export function TempPasswordSuccessModal({
  isOpen,
  onClose,
  variant,
  userName,
  email,
  tempPassword,
}: TempPasswordSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard pode falhar em http (não-https). Não bloqueia o fluxo.
    }
  };

  const title = variant === 'created'
    ? `✅ ${userName} criado`
    : `✅ Senha de ${userName} resetada`;

  return (
    <ActionSheet isOpen={isOpen} onClose={onClose} title={title} subtitle={email}>
      <div className="space-y-5 py-2">
        <div className="bg-slate-50 p-4 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Senha temporária
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-2xl font-bold text-[#4E593F] tracking-wider">
              {tempPassword}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copiar senha"
              className="h-11 px-4 rounded-xl bg-[#4E593F] text-white font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-[#3E4732] active:scale-95 transition-all"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl flex gap-3">
          <ShieldCheck size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Compartilhe esta senha com o usuário por WhatsApp ou pessoalmente.
            No primeiro acesso, ele será obrigado a definir uma nova senha.
          </p>
        </div>

        <Button
          onClick={onClose}
          className="w-full h-12 rounded-full bg-[#4E593F] hover:bg-[#3E4732] text-white font-bold shadow-lg shadow-[#4E593F]/20"
        >
          Entendi
        </Button>
      </div>
    </ActionSheet>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
npx tsc --noEmit
```
Expected: exit 0, sem erros.

- [ ] **Step 3: Commit**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha
git add estancia-tordilha-pwa/src/components/gestor/TempPasswordSuccessModal.tsx
git commit -m "$(cat <<'EOF'
feat: TempPasswordSuccessModal reusável (criação + reset)

ActionSheet com senha em destaque, botão Copiar (clipboard API com
fallback silencioso), aviso visual e botão Entendi. Vai ser usado
pelos fluxos de criação e reset no painel do gestor.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: GestorAdminPanel — substituir toast por TempPasswordSuccessModal no create

**Files:**
- Modify: `estancia-tordilha-pwa/src/components/gestor/GestorAdminPanel.tsx`

**Contexto:** Hoje após criar o user, mostra um toast curto com a senha. Trocar pelo modal reusável que dá ao gestor tempo de copiar.

- [ ] **Step 1: Adicionar import e state**

Em `GestorAdminPanel.tsx`, adicionar import (depois dos outros imports do projeto):

```tsx
import { TempPasswordSuccessModal } from "./TempPasswordSuccessModal";
```

E adicionar state perto dos outros `useState`:

```tsx
const [successModal, setSuccessModal] = useState<{
  variant: 'created' | 'reset';
  userName: string;
  email: string;
  tempPassword: string;
} | null>(null);
```

- [ ] **Step 2: Trocar o toast pelo modal no handleCreateUser**

Localizar o trecho atual em `handleCreateUser`:

```tsx
      toast({
        title: "Sucesso!",
        description: data?.tempPassword
          ? `Usuário criado. Senha temporária: ${data.tempPassword}. Já enviamos por e-mail.`
          : `Cargo atualizado. O usuário já existia no sistema.`,
      });

      setNewUserName("");
      setNewUserEmail("");
      setShowForm(false);
```

Substituir por:

```tsx
      // Modal de sucesso (em vez do toast efêmero) — gestor precisa de tempo pra copiar.
      if (data?.tempPassword) {
        setSuccessModal({
          variant: 'created',
          userName: newUserName,
          email: newUserEmail,
          tempPassword: data.tempPassword,
        });
      } else {
        toast({ title: "Sucesso!", description: "Operação concluída." });
      }

      setNewUserName("");
      setNewUserEmail("");
      setShowForm(false);
```

- [ ] **Step 3: Renderizar o modal**

No JSX retornado pelo componente, **antes** do `</div>` final do componente, adicionar:

```tsx
      {successModal && (
        <TempPasswordSuccessModal
          isOpen={true}
          onClose={() => {
            setSuccessModal(null);
            refetch?.();
          }}
          variant={successModal.variant}
          userName={successModal.userName}
          email={successModal.email}
          tempPassword={successModal.tempPassword}
        />
      )}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 5: Smoke test manual em dev**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
npm run dev
```

Browser: navegar pra `http://localhost:5173` → logar como gestor → ir em Administração → aba Terapeutas → clicar "+" (Novo Terapeuta) → preencher com `manual-test-2026-05-11@example.com` e "Teste Manual" → submeter.

Expected: ActionSheet aparece com "✅ Teste Manual criado", senha `Tordilha@2026` em destaque, botão "Copiar". Clicar Copiar → mostra "Copiado" por 2s.

Limpar depois: ir na lista, clicar excluir naquele user (botão lixeira existente).

- [ ] **Step 6: Commit**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha
git add estancia-tordilha-pwa/src/components/gestor/GestorAdminPanel.tsx
git commit -m "$(cat <<'EOF'
feat(admin): TempPasswordSuccessModal substitui toast pós-criação

Toast efêmero não dá tempo do gestor copiar a senha. ActionSheet
fica até o gestor clicar Entendi. Refetch da lista acontece no close.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: GestorAdminPanel — botão "Resetar" nos cards + integração

**Files:**
- Modify: `estancia-tordilha-pwa/src/components/gestor/GestorAdminPanel.tsx`

- [ ] **Step 1: Adicionar import de ícone**

Em `GestorAdminPanel.tsx`, no import do lucide-react, adicionar `Key`:

Localizar:
```tsx
import { Mail, User, ChevronRight, Search, Loader2, ShieldCheck, Trash2 } from "lucide-react";
```

Substituir por:
```tsx
import { Mail, User, ChevronRight, Search, Loader2, ShieldCheck, Trash2, Key } from "lucide-react";
```

- [ ] **Step 2: Adicionar handler `handleResetPassword`**

Adicionar a função imediatamente após o `handleDeleteUser` (que termina perto da linha 127):

```tsx
  const handleResetPassword = async (userId: string, userName: string, email: string) => {
    if (!confirm(
      `Resetar senha de ${userName} (${email})?\n\n` +
      `A senha atual será substituída por Tordilha@2026.\n` +
      `O usuário será obrigado a definir uma nova senha no próximo login.`
    )) return;

    try {
      setSubmitting(true);
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { action: 'reset-password', userId },
      });

      if (error) {
        const body = await (error as any).context?.json().catch(() => ({}));
        throw new Error(body?.error || error.message);
      }

      if (data?.tempPassword) {
        setSuccessModal({
          variant: 'reset',
          userName,
          email,
          tempPassword: data.tempPassword,
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao resetar",
        description: err.message || "Falha ao resetar a senha.",
      });
    } finally {
      setSubmitting(false);
    }
  };
```

- [ ] **Step 3: Adicionar botão Reset no card**

Localizar o trecho que contém o botão de delete (perto da linha 188):

```tsx
              <div className="flex items-center gap-2">
                <button
                  disabled={submitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(user.id, user.full_name || "");
                  }}
                  className="p-2.5 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                </button>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
```

Substituir por (adicionando o botão Reset ANTES do delete):

```tsx
              <div className="flex items-center gap-2">
                <button
                  disabled={submitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetPassword(user.id, user.full_name || user.email || "Usuário", user.email || "");
                  }}
                  aria-label="Resetar senha"
                  className="p-2.5 rounded-xl hover:bg-[#4E593F]/10 text-slate-300 hover:text-[#4E593F] transition-colors disabled:opacity-50"
                >
                  <Key size={18} />
                </button>
                <button
                  disabled={submitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(user.id, user.full_name || "");
                  }}
                  aria-label="Excluir usuário"
                  className="p-2.5 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                </button>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 5: Smoke test manual em dev**

`npm run dev` → logar como gestor → Admin → criar um user de teste → na lista, clicar no ícone de chave → confirmar no dialog → modal de sucesso aparece com `Tordilha@2026`.

- [ ] **Step 6: Commit**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha
git add estancia-tordilha-pwa/src/components/gestor/GestorAdminPanel.tsx
git commit -m "$(cat <<'EOF'
feat(admin): botão Resetar senha nos cards de usuário

Cada card de terapeuta/gestor ganha botão Key (chave) que pede
confirmação e chama a edge function reset-password. Mostra o
mesmo TempPasswordSuccessModal da criação.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: GestorAdminPanel — copy button + texto correto no modal "Novo Terapeuta"

**Files:**
- Modify: `estancia-tordilha-pwa/src/components/gestor/GestorAdminPanel.tsx`

**Contexto:** O card azul "Senha temporária" no modal de criação ainda menciona "por e-mail" (texto que mudei pela manhã mas precisa atualizar de novo agora que NÃO existe mais email). Trocar texto + adicionar botão Copiar pra senha.

- [ ] **Step 1: Atualizar texto do card e adicionar botão Copiar**

Localizar (linhas ~252-258):

```tsx
          <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 mt-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-900">Senha temporária</p>
              <p className="text-[11px] text-blue-700 leading-tight mt-0.5">
                O usuário receberá a senha temporária por e-mail. No primeiro acesso, ele será obrigado a definir uma senha pessoal.
              </p>
            </div>
          </div>
```

Substituir por:

```tsx
          <div className="bg-blue-50 p-4 rounded-2xl mt-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-blue-900">Senha temporária: Tordilha@2026</p>
                <p className="text-[11px] text-blue-700 leading-tight mt-0.5">
                  Anote e compartilhe com o usuário. No primeiro acesso, ele será obrigado a definir uma senha pessoal.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText('Tordilha@2026');
                  toast({ title: "Senha copiada", description: "Tordilha@2026 copiada pro clipboard." });
                } catch {
                  toast({ variant: "destructive", title: "Falha ao copiar", description: "Anote manualmente: Tordilha@2026" });
                }
              }}
              className="mt-3 w-full h-9 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              📋 Copiar senha temporária
            </button>
          </div>
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Smoke test manual**

`npm run dev` → Admin → "+" → ver o card azul. Texto não menciona email. Botão "Copiar senha temporária" funciona (clica e toast confirma).

- [ ] **Step 4: Commit**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha
git add estancia-tordilha-pwa/src/components/gestor/GestorAdminPanel.tsx
git commit -m "$(cat <<'EOF'
feat(admin): copy button + texto sem menção a email no modal Novo

Card azul agora explicita a senha (Tordilha@2026), avisa pra anotar
manualmente, oferece botão Copiar. Sem mais "receberá por e-mail".

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Login.tsx — texto estático "Esqueceu? Procure o gestor"

**Files:**
- Modify: `estancia-tordilha-pwa/src/pages/Login.tsx`

- [ ] **Step 1: Comentar o bloco de handleAuth do mode forgotPassword**

Localizar (linhas ~56-66):

```tsx
            if (mode === "forgotPassword") {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) throw error;
                toast({
                    title: "Email de recuperação enviado",
                    description: "Verifique sua caixa de entrada para redefinir a senha.",
                });
                setMode("signIn");
                return;
            } else if (mode === "signIn") {
```

Substituir por:

```tsx
            /* Desativado em 2026-05-11 — fluxo de recuperação migrado pro gestor (resetar no painel Admin).
               Pra religar: descomentar este bloco, restaurar o link "Recuperar" no JSX, e descomentar
               a rota /reset-password em App.tsx + body de ResetPassword.tsx.

            if (mode === "forgotPassword") {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) throw error;
                toast({
                    title: "Email de recuperação enviado",
                    description: "Verifique sua caixa de entrada para redefinir a senha.",
                });
                setMode("signIn");
                return;
            } else */
            if (mode === "signIn") {
```

- [ ] **Step 2: Comentar emailRedirectTo no signUp**

Localizar (linha ~104):

```tsx
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: {
```

Substituir por:

```tsx
                    options: {
                        // emailRedirectTo: window.location.origin, // Desativado em 2026-05-11 — não há mais email de confirmação
                        data: {
```

- [ ] **Step 3: Substituir link "Recuperar" por texto estático**

Localizar (linhas ~609-616):

```tsx
                    {mode === "signIn" && (
                        <p className="text-sm text-slate-500 font-medium pt-2">
                            Esqueceu sua senha?{" "}
                            <button type="button" onClick={() => setMode("forgotPassword")} className="text-slate-700 font-bold hover:text-[#4E593F] transition-colors">
                                Recuperar
                            </button>
                        </p>
                    )}

                    {mode === "forgotPassword" && (
                        <p className="text-sm text-slate-500 font-medium pt-2">
                            Lembrou a senha?{" "}
                            <button type="button" onClick={() => setMode("signIn")} className="text-slate-700 font-bold hover:text-[#4E593F] transition-colors">
                                Voltar ao Login
                            </button>
                        </p>
                    )}
```

Substituir por:

```tsx
                    {mode === "signIn" && (
                        <p className="text-sm text-slate-500 font-medium pt-2">
                            Esqueceu sua senha?{" "}
                            <span className="text-slate-700 font-bold">
                                Procure o gestor da Estância.
                            </span>
                        </p>
                    )}

                    {/* Desativado em 2026-05-11 — modo forgotPassword removido. Pra religar:
                        substituir o <span> acima por um <button onClick={() => setMode("forgotPassword")}>Recuperar</button>
                        e descomentar este bloco.
                    {mode === "forgotPassword" && (
                        <p className="text-sm text-slate-500 font-medium pt-2">
                            Lembrou a senha?{" "}
                            <button type="button" onClick={() => setMode("signIn")} className="text-slate-700 font-bold hover:text-[#4E593F] transition-colors">
                                Voltar ao Login
                            </button>
                        </p>
                    )} */}
```

- [ ] **Step 4: Comentar a opção "forgotPassword" no estado mode (TS warning)**

Localizar (linha ~15):

```tsx
    const [mode, setMode] = useState<"signIn" | "signUp" | "forgotPassword">("signIn");
```

Manter o tipo (compatibilidade com o código comentado), mas o `"forgotPassword"` nunca será setado.

Localizar (linhas ~257-261):

```tsx
                    <p className="text-slate-500 font-medium">
                        {mode === "signIn" ? "Faça login para acessar o sistema" :
                            mode === "signUp" ? "Crie sua conta para começar" :
                                "Recupere o acesso à sua conta"}
                    </p>
```

Como o `forgotPassword` nunca é mais ativo, simplificar:

```tsx
                    <p className="text-slate-500 font-medium">
                        {mode === "signIn" ? "Faça login para acessar o sistema" : "Crie sua conta para começar"}
                    </p>
```

E localizar (linha ~241):

```tsx
                description: mode === "forgotPassword" ? "Erro ao recuperar senha" : mode === "signIn" ? "Erro no login" : "Erro no cadastro",
```

Simplificar:

```tsx
                description: mode === "signIn" ? "Erro no login" : "Erro no cadastro",
```

E localizar (linhas ~525-526 e ~568-570):

```tsx
                    {mode !== "forgotPassword" && (
                        <div className="space-y-2">
```

Como nunca mais é forgotPassword, o campo de senha sempre aparece. Pra simplificar e remover a condição:

Localizar (linha ~525):
```tsx
                    {mode !== "forgotPassword" && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 ml-1">Senha</label>
```

Substituir por:
```tsx
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Senha</label>
```

E remover o fechamento `)}` correspondente (procurar pelo próximo fechamento que casa — provavelmente perto da linha 559).

Em vez de remover o `)}`, conferir o nesting. **Verificação manual recomendada antes de prosseguir** — abrir o arquivo, achar o `{mode !== "forgotPassword" && (` e o `)}` que fecha, remover ambos consistentemente.

E na linha ~570:

```tsx
                        {loading ? "Processando..." : (
                            <span className="flex items-center gap-2">
                                {mode === "signIn" ? "Entrar" : mode === "signUp" ? "Criar Conta" : "Enviar Email"} <LogIn size={20} strokeWidth={2} className="text-white" />
                            </span>
                        )}
```

Simplificar:
```tsx
                        {loading ? "Processando..." : (
                            <span className="flex items-center gap-2">
                                {mode === "signIn" ? "Entrar" : "Criar Conta"} <LogIn size={20} strokeWidth={2} className="text-white" />
                            </span>
                        )}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 6: Smoke test manual**

`npm run dev` → tela de Login → confirmar:
- Campo "E-mail" + "Senha" + botão "Entrar" funcionam (signIn).
- "Cadastre-se" abre o form de signup (não navega pra forgot).
- Texto "Esqueceu sua senha? Procure o gestor da Estância." aparece estaticamente.
- Não há nenhum link clicável "Recuperar" ou similar.

- [ ] **Step 7: Commit**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha
git add estancia-tordilha-pwa/src/pages/Login.tsx
git commit -m "$(cat <<'EOF'
feat(login): texto estático "Procure o gestor", comenta forgotPassword

Link Recuperar vira span estático. Lógica de forgotPassword (chamada
resetPasswordForEmail, modo, copy "Lembrou a senha?") comentada com
header de motivo/data. emailRedirectTo no signUp também comentado.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: useResponsaveis — hook de listagem

**Files:**
- Create: `estancia-tordilha-pwa/src/hooks/useResponsaveis.ts`

**Contexto:** Hook que retorna lista de responsáveis com nome, email, telefone, e count de alunos vinculados via `aluno_responsavel`.

- [ ] **Step 1: Criar o arquivo**

Criar `estancia-tordilha-pwa/src/hooks/useResponsaveis.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Responsavel = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  alunos_count: number;
};

export function useResponsaveis() {
  const query = useQuery({
    queryKey: ["responsaveis"],
    queryFn: async (): Promise<Responsavel[]> => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("id, nome, email, telefone, aluno_responsavel(count)")
        .order("nome", { ascending: true });

      if (error) {
        console.error("Erro ao buscar responsáveis:", error);
        return [];
      }

      return (data ?? []).map((r: any) => ({
        id: r.id,
        nome: r.nome,
        email: r.email,
        telefone: r.telefone,
        alunos_count: r.aluno_responsavel?.[0]?.count ?? 0,
      }));
    },
  });

  return {
    responsaveis: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
```

- [ ] **Step 2: Verificar que a consulta funciona (test ad-hoc)**

Antes de seguir, validar que o SELECT funciona via MCP:

```sql
SELECT r.id, r.nome, r.email, r.telefone,
       (SELECT COUNT(*) FROM aluno_responsavel ar WHERE ar.responsavel_id = r.id) AS alunos_count
FROM responsaveis r
ORDER BY r.nome
LIMIT 5;
```

Rodar via `mcp__plugin_supabase_supabase__execute_sql` com `project_id=ojkvbejaqryjmvevazpj`.
Expected: lista de responsáveis com counts numéricos.

Se a forma com PostgREST `aluno_responsavel(count)` não funcionar (pode dar erro de relação não declarada), substituir o queryFn por uma versão que faz duas queries:

```ts
// Fallback se PostgREST não suportar a sintaxe count
const { data: respList } = await supabase
  .from("responsaveis")
  .select("id, nome, email, telefone")
  .order("nome", { ascending: true });

const ids = (respList ?? []).map(r => r.id);
const { data: counts } = await supabase
  .from("aluno_responsavel")
  .select("responsavel_id")
  .in("responsavel_id", ids);

const countsMap = new Map<string, number>();
(counts ?? []).forEach((c: any) => {
  countsMap.set(c.responsavel_id, (countsMap.get(c.responsavel_id) ?? 0) + 1);
});

return (respList ?? []).map(r => ({
  id: r.id,
  nome: r.nome,
  email: r.email,
  telefone: r.telefone,
  alunos_count: countsMap.get(r.id) ?? 0,
}));
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha
git add estancia-tordilha-pwa/src/hooks/useResponsaveis.ts
git commit -m "$(cat <<'EOF'
feat(hooks): useResponsaveis lista responsáveis + count de alunos

Hook TanStack Query que retorna nome, email, telefone e count
de alunos vinculados (via aluno_responsavel). Vai alimentar a
nova aba "Responsáveis" no painel Admin.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: GestorAdminPanel — aba "Responsáveis" + reset por email

**Files:**
- Modify: `estancia-tordilha-pwa/src/components/gestor/GestorAdminPanel.tsx`

**Contexto:** Adicionar 3ª aba. Sem botão "+". Cards com nome, email, count de alunos, botões reset e excluir. Reset e delete usam `email` na chamada (edge function já resolve internamente).

- [ ] **Step 1: Adicionar import de useResponsaveis**

Em `GestorAdminPanel.tsx`, no topo:

```tsx
import { useResponsaveis } from "@/hooks/useResponsaveis";
```

- [ ] **Step 2: Estender state activeType pra incluir "pais"**

Localizar:
```tsx
  const [activeType, setActiveType] = useState<"professor" | "gestor">("professor");
```

Substituir por:
```tsx
  const [activeType, setActiveType] = useState<"professor" | "gestor" | "pais">("professor");
```

- [ ] **Step 3: Hookar useResponsaveis e definir lista filtrada**

Logo após o `useProfessores`:

```tsx
  const { responsaveis, isLoading: isLoadingResp, refetch: refetchResp } = useResponsaveis();
```

Localizar o `filteredUsers` atual:

```tsx
  const filteredUsers = professores.filter(p => 
    p.role === activeType && 
    p.email?.toLowerCase() !== "leonardo.informatica@gmail.com" &&
    (
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
```

Substituir por:

```tsx
  const filteredUsers = activeType === 'pais'
    ? [] // 'pais' usa filteredResponsaveis abaixo, não esta lista
    : professores.filter(p =>
        p.role === activeType &&
        p.email?.toLowerCase() !== "leonardo.informatica@gmail.com" &&
        (
          p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );

  const filteredResponsaveis = responsaveis.filter(r =>
    r.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
```

- [ ] **Step 4: Adicionar o 3º botão de aba**

Localizar (perto da linha 134 — o `<div className="flex bg-slate-100 p-1 rounded-2xl w-full">` que contém as duas abas):

```tsx
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full">
          <button
            onClick={() => setActiveType("professor")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeType === "professor" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Terapeutas
          </button>
          <button
            onClick={() => setActiveType("gestor")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              activeType === "gestor" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Gestores
          </button>
        </div>
```

Substituir por:

```tsx
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full">
          <button
            onClick={() => setActiveType("professor")}
            className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all ${
              activeType === "professor" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Terapeutas
          </button>
          <button
            onClick={() => setActiveType("gestor")}
            className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all ${
              activeType === "gestor" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Gestores
          </button>
          <button
            onClick={() => setActiveType("pais")}
            className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all ${
              activeType === "pais" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Responsáveis
          </button>
        </div>
```

- [ ] **Step 5: Atualizar placeholder de busca pra incluir "responsável"**

Localizar a linha do placeholder atual:

```tsx
            placeholder={`Buscar ${activeType === 'professor' ? 'terapeuta' : 'gestor'}...`}
```

Substituir por:

```tsx
            placeholder={`Buscar ${activeType === 'professor' ? 'terapeuta' : activeType === 'gestor' ? 'gestor' : 'responsável'}...`}
```

- [ ] **Step 6: Renderizar cards de responsáveis quando activeType === 'pais'**

Localizar o bloco de loading + listagem (perto da linha 165):

```tsx
      <div className="grid grid-cols-1 gap-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="animate-spin text-[#4E593F]" size={32} />
            <p className="text-sm font-medium text-slate-500">Carregando...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            // ... card de user existente
          ))
        ) : (
          <div className="bg-slate-50 rounded-3xl p-8 border border-dashed border-slate-200 text-center">
            <p className="text-sm text-slate-500">Nenhum {activeType === 'professor' ? 'terapeuta' : 'gestor'} encontrado.</p>
          </div>
        )}
      </div>
```

Refatorar pra renderizar 3 cenários (loading, terapeuta/gestor, responsáveis):

```tsx
      <div className="grid grid-cols-1 gap-3">
        {(activeType === 'pais' ? isLoadingResp : isLoading) ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="animate-spin text-[#4E593F]" size={32} />
            <p className="text-sm font-medium text-slate-500">Carregando...</p>
          </div>
        ) : activeType === 'pais' ? (
          filteredResponsaveis.length > 0 ? (
            filteredResponsaveis.map((r) => (
              <div
                key={r.id}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <AvatarWithFallback
                    src={null}
                    alt={r.nome || "Responsável"}
                    className="w-12 h-12 rounded-2xl border-2 border-slate-50"
                    type="user"
                  />
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">{r.nome || "Sem nome"}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{r.email}</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                      {r.alunos_count} {r.alunos_count === 1 ? 'aluno' : 'alunos'} vinculado{r.alunos_count === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={submitting}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetPasswordByEmail(r.email || "", r.nome || "Responsável");
                    }}
                    aria-label="Resetar senha"
                    className="p-2.5 rounded-xl hover:bg-[#4E593F]/10 text-slate-300 hover:text-[#4E593F] transition-colors disabled:opacity-50"
                  >
                    <Key size={18} />
                  </button>
                  <button
                    disabled={submitting}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUserByEmail(r.email || "", r.nome || "Responsável");
                    }}
                    aria-label="Excluir responsável"
                    className="p-2.5 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-50 rounded-3xl p-8 border border-dashed border-slate-200 text-center">
              <p className="text-sm text-slate-500">Nenhum responsável encontrado.</p>
            </div>
          )
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            // ... mantém o card existente de terapeuta/gestor que já está acima — não duplicar; este bloco
            // continua sendo o map que já existe no arquivo. Aqui está só ilustrativo.
            <div key={user.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all">
              {/* conteúdo atual do card */}
            </div>
          ))
        ) : (
          <div className="bg-slate-50 rounded-3xl p-8 border border-dashed border-slate-200 text-center">
            <p className="text-sm text-slate-500">Nenhum {activeType === 'professor' ? 'terapeuta' : 'gestor'} encontrado.</p>
          </div>
        )}
      </div>
```

**Nota crítica:** o bloco `filteredUsers.map((user) => ( ... ))` deve preservar o JSX atual completo do card (com os botões Reset + Delete que foram adicionados na Task 4). Não substituir com o stub mostrado acima — adaptar mantendo o conteúdo existente.

- [ ] **Step 7: Adicionar handlers `handleResetPasswordByEmail` e `handleDeleteUserByEmail`**

Logo após o `handleResetPassword` que foi adicionado na Task 4:

```tsx
  const handleResetPasswordByEmail = async (email: string, userName: string) => {
    if (!email) {
      toast({ variant: "destructive", title: "Sem email", description: "Esse responsável não tem email cadastrado." });
      return;
    }
    if (!confirm(
      `Resetar senha de ${userName} (${email})?\n\n` +
      `A senha atual será substituída por Tordilha@2026.\n` +
      `O usuário será obrigado a definir uma nova senha no próximo login.`
    )) return;

    try {
      setSubmitting(true);
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { action: 'reset-password', email },
      });
      if (error) {
        const body = await (error as any).context?.json().catch(() => ({}));
        throw new Error(body?.error || error.message);
      }
      if (data?.tempPassword) {
        setSuccessModal({ variant: 'reset', userName, email, tempPassword: data.tempPassword });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao resetar", description: err.message || "Falha." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUserByEmail = async (email: string, userName: string) => {
    if (!email) return;
    if (!confirm(`Tem certeza que deseja remover permanentemente o acesso de ${userName}?`)) return;
    try {
      setSubmitting(true);
      const { error } = await supabase.functions.invoke('create-user', {
        body: { action: 'delete', email },
      });
      if (error) {
        const body = await (error as any).context?.json().catch(() => ({}));
        throw new Error(body?.error || error.message);
      }
      toast({ title: "Responsável removido", description: "Registro excluído do sistema." });
      await refetchResp();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Falha na Exclusão", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };
```

- [ ] **Step 8: Esconder o FAB de "Novo +" quando activeType === 'pais'**

Localizar o trecho que renderiza o título e botão "+" (procurar pelo padrão `setShowForm(true)` no botão de adicionar — pode estar via FAB ou diretamente). Localizar o handler `useEffect` (linha ~22) que ouve `open-form-professor` / `open-form-gestor` — não há listener pra `open-form-pais`, ótimo (não vai ser disparado).

Se houver botão "+" visível diretamente no JSX do componente, envolvê-lo em condição: `{activeType !== 'pais' && (...)}`. Se não houver (o FAB vier do `BottomNav` ou `Index`), confirmar manualmente no smoke test e ajustar conforme.

- [ ] **Step 9: Verificar TypeScript**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 10: Smoke test manual**

`npm run dev` → Admin:
- Clicar aba "Responsáveis" → lista carrega.
- Cards mostram nome, email, count de alunos.
- Reset funciona (modal de sucesso).
- Excluir funciona (confirm + toast).
- Sem botão "+" na aba (criação é só via signup).

- [ ] **Step 11: Commit**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha
git add estancia-tordilha-pwa/src/components/gestor/GestorAdminPanel.tsx
git commit -m "$(cat <<'EOF'
feat(admin): aba Responsáveis com reset por email

3ª aba no painel Admin, sem botão de criar (criação é self-signup).
Cards mostram nome, email, count de alunos vinculados. Reset e
delete chamam a edge function passando 'email' (resolvido pra userId
internamente).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Renomear ProfessorPasswordPrompt → FirstAccessPasswordPrompt

**Files:**
- Move: `estancia-tordilha-pwa/src/components/professor/ProfessorPasswordPrompt.tsx` → `estancia-tordilha-pwa/src/components/auth/FirstAccessPasswordPrompt.tsx`
- Modify: `estancia-tordilha-pwa/src/pages/Index.tsx`

- [ ] **Step 1: Mover e renomear o arquivo**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
git mv src/components/professor/ProfessorPasswordPrompt.tsx src/components/auth/FirstAccessPasswordPrompt.tsx
```

- [ ] **Step 2: Renomear o export dentro do arquivo**

Editar `src/components/auth/FirstAccessPasswordPrompt.tsx`:

Localizar:
```tsx
export const ProfessorPasswordPrompt = () => {
```

Substituir por:
```tsx
export const FirstAccessPasswordPrompt = () => {
```

- [ ] **Step 3: Atualizar import e uso em Index.tsx**

Em `src/pages/Index.tsx`, localizar:

```tsx
import { ProfessorPasswordPrompt } from "@/components/professor/ProfessorPasswordPrompt";
```

Substituir por:

```tsx
import { FirstAccessPasswordPrompt } from "@/components/auth/FirstAccessPasswordPrompt";
```

E localizar o uso `<ProfessorPasswordPrompt />` (linha ~149):

```tsx
        <ProfessorPasswordPrompt />
```

Substituir por:

```tsx
        <FirstAccessPasswordPrompt />
```

- [ ] **Step 4: Verificar que o componente é renderizado pra TODOS roles, não só professor**

Abrir `src/pages/Index.tsx` perto da linha 149. Confirmar que o `<FirstAccessPasswordPrompt />` aparece em local que renderiza pra qualquer role (não dentro de `{role === 'professor' && (...)}`).

Se estiver gated por role, **mover** o componente pra um nível mais alto onde sempre renderiza (independente da role). O check de `needs_password_change` já está dentro do useEffect do próprio componente, então renderizá-lo sempre é seguro — ele só abre o modal quando precisa.

- [ ] **Step 5: Verificar TypeScript**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
npx tsc --noEmit
```
Expected: exit 0.

Se aparecer erro de import não encontrado em algum outro arquivo (caso o componente seja importado em mais lugares que o `Index.tsx`), atualizar esses imports também.

- [ ] **Step 6: Smoke test manual**

`npm run dev` → criar um terapeuta de teste → logout → login com a senha temp → modal "Bem-vindo à Tordilha!" deve aparecer obrigatório.

Repetir o teste pra responsável (criar via signup → modal deve aparecer no signup, ou no próximo login com senha resetada pelo gestor).

- [ ] **Step 7: Commit**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha
git add estancia-tordilha-pwa/src/components/auth/FirstAccessPasswordPrompt.tsx \
        estancia-tordilha-pwa/src/components/professor/ProfessorPasswordPrompt.tsx \
        estancia-tordilha-pwa/src/pages/Index.tsx
git commit -m "$(cat <<'EOF'
refactor: ProfessorPasswordPrompt -> FirstAccessPasswordPrompt

Componente serve qualquer role (terapeuta, gestor, responsável)
após criação ou reset com senha temporária. Movido pra auth/.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Comentar rota /reset-password no App.tsx + body de ResetPassword.tsx

**Files:**
- Modify: `estancia-tordilha-pwa/src/App.tsx`
- Modify: `estancia-tordilha-pwa/src/pages/ResetPassword.tsx`

- [ ] **Step 1: Comentar a rota no App.tsx**

Localizar em `src/App.tsx`:

```tsx
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
```

Substituir por:

```tsx
// Desativado em 2026-05-11 — fluxo de recuperação por email removido. Pra religar: descomentar.
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
```

(Mantém vivo o import porque o componente vai virar um redirect — ver Step 2.)

Localizar:

```tsx
              <Route path="/reset-password" element={<ResetPassword />} />
```

Manter como está. O componente passa a redirecionar.

- [ ] **Step 2: Substituir body de ResetPassword.tsx por um redirect**

Editar `src/pages/ResetPassword.tsx` inteiro pra:

```tsx
import { Navigate } from "react-router-dom";

/* Desativado em 2026-05-11 — fluxo de recuperação por email removido.
   Esta página agora redireciona pra /login. Pra religar o fluxo original:
   1) descomentar o body anterior (consultar git history: `git show HEAD~N:src/pages/ResetPassword.tsx`)
   2) descomentar o link "Recuperar" em src/pages/Login.tsx
   3) descomentar o bloco mode === "forgotPassword" em handleAuth do Login.tsx
*/

const ResetPassword = () => <Navigate to="/login" replace />;

export default ResetPassword;
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 4: Smoke test manual**

`npm run dev` → navegar pra `http://localhost:5173/reset-password` → deve redirecionar pra `/login`.

- [ ] **Step 5: Commit**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha
git add estancia-tordilha-pwa/src/App.tsx estancia-tordilha-pwa/src/pages/ResetPassword.tsx
git commit -m "$(cat <<'EOF'
feat(routes): /reset-password redireciona pra /login

Rota fica viva pra não quebrar URLs antigas, mas o componente
vira um Navigate. Body original preservado em git history.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Smoke test E2E completo + deploy

**Files:** nenhum modificado nesta task — só verificação manual e deploy.

- [ ] **Step 1: Manual no Supabase Dashboard — desligar "Confirm email"**

Abrir https://supabase.com/dashboard/project/ojkvbejaqryjmvevazpj/auth/providers (ou Authentication → Sign In/Up).

Localizar **"Confirm email"** e **desligar**.

- [ ] **Step 2: Smoke test #1 — criação pelo gestor**

`npm run dev` → logar como gestor → Admin → Terapeutas → "+" → criar `e2e-terapeuta-2026-05-11@example.com` (senha digitada não importa pois a função força `Tordilha@2026`) → modal de sucesso aparece → copiar a senha.

Logout. Login com o email criado + `Tordilha@2026` → modal `FirstAccessPasswordPrompt` aparece obrigatório → trocar pra `NovaSenha123@` → loga normal.

- [ ] **Step 3: Smoke test #2 — reset pelo gestor**

Logout. Logar como gestor → Admin → Terapeutas → encontrar o `e2e-terapeuta-2026-05-11` → clicar Reset → confirmar → modal sucesso.

Logout. Login com o email + `Tordilha@2026` → modal obrigatório → trocar.

- [ ] **Step 4: Smoke test #3 — signup de responsável sem email**

Logout. Clicar "Cadastre-se" → preencher form (Responsável "E2E Pais", `e2e-pais-2026-05-11@example.com`, senha `Pais2026@`, 1 aluno teste, LGPD marcado) → submeter.

Expected: **navega direto pra `/`** sem pedir confirmação de email. Verificar no console do navegador que NÃO há requisição pendente esperando confirmação.

- [ ] **Step 5: Smoke test #4 — reset de responsável**

Logout. Logar como gestor → Admin → aba Responsáveis → encontrar "E2E Pais" → Reset → modal sucesso.

Logout. Login `e2e-pais-2026-05-11@example.com` + `Tordilha@2026` → modal `FirstAccessPasswordPrompt` aparece.

- [ ] **Step 6: Smoke test #5 — link "Esqueceu sua senha?"**

Tela de Login → confirmar que aparece o texto estático "Esqueceu sua senha? Procure o gestor da Estância." sem nenhum link clicável.

- [ ] **Step 7: Smoke test #6 — re-criar email existente bloqueado**

Como gestor → Admin → "+" → tentar criar com `e2e-terapeuta-2026-05-11@example.com` (que já existe) → toast de erro "Este e-mail já tem cadastro. Use 'Resetar senha' do usuário existente."

- [ ] **Step 8: Cleanup dos users de teste**

Como gestor → Admin → excluir `e2e-terapeuta-2026-05-11` e `e2e-pais-2026-05-11`.

Confirmar via MCP que foram removidos de `auth.users` E de `responsaveis`:

```sql
SELECT email FROM auth.users WHERE email LIKE 'e2e-%2026-05-11@example.com';
SELECT email FROM public.responsaveis WHERE email LIKE 'e2e-%2026-05-11@example.com';
```

Expected: ambos retornam 0 linhas.

- [ ] **Step 9: Build de produção**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
npm run build
```
Expected: `✓ built in <Ns>`, exit 0, sem erros do TypeScript.

- [ ] **Step 10: Deploy Vercel**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha/estancia-tordilha-pwa
vercel --prod --yes
```
Expected: `readyState: "READY"`, `target: "production"`, alias atualizado pra `estancia-tordilha.vercel.app`.

- [ ] **Step 11: Smoke test em produção**

Browser → https://estancia-tordilha.vercel.app/login → repetir o smoke test #1 (criação de terapeuta) e #6 (texto "Procure o gestor"). Validar que o fluxo funciona em produção.

- [ ] **Step 12: Atualizar memory com decisão arquitetural**

Salvar em `/Users/leonardo/.claude/projects/-Users-leonardo-Desktop-Projetos-estancia-tordilha/memory/project_no_email_flow.md`:

```markdown
---
name: Fluxo sem email — gestor gerencia senhas
description: App não usa email em nenhum fluxo. Gestor cria/reseta senhas no painel Admin.
type: project
---

A partir de 2026-05-11, o app Estância Tordilha **não tem dependência de email**:

- Criação de terapeuta/gestor: pelo Admin, senha temporária `Tordilha@2026` mostrada na tela.
- Reset de senha (qualquer role): pelo Admin, botão "Resetar" no card. Mesma senha temporária.
- Recuperação de senha pelo próprio usuário: removida. Link "Esqueceu?" virou texto estático.
- Self-signup do responsável: continua, mas Supabase "Confirm email" está DESLIGADO. Cadastrou, entra direto.
- Todo user criado/resetado com `Tordilha@2026` tem `needs_password_change: true` no metadata, e o modal `FirstAccessPasswordPrompt` força troca obrigatória no próximo login.

**Why:** cliente sem apetite por investimento em domínio próprio + reputação ruim do `onboarding@resend.dev`. Optamos por eliminar email em vez de manter sandbox com risco de spam.

**How to apply:** ao adicionar novos fluxos, NÃO introduzir email (welcome, confirmação, magic link, recuperação). Toda comunicação de credencial passa pelo gestor in-app + canal externo (WhatsApp/voz).
```

Adicionar entrada em `MEMORY.md`:

```markdown
- [project_no_email_flow.md](project_no_email_flow.md) — App não tem fluxo de email; gestor gerencia senhas no painel Admin
```

- [ ] **Step 13: Commit final + push (se autorizado)**

```bash
cd /Users/leonardo/Desktop/Projetos/estancia-tordilha
git log --oneline -15
```

Confirmar que os commits estão na ordem. Se o usuário autorizar `git push`, fazer.

---

## Self-Review

**Spec coverage:**
- ✅ Criação sem email — Tasks 1, 3, 5
- ✅ Reset pelo gestor — Tasks 1, 4, 8
- ✅ Self-signup sem confirmação — Tasks 6 (front), 11 step 1 (Supabase config manual)
- ✅ Link "Esqueceu?" estático — Task 6
- ✅ Aba Responsáveis — Tasks 7, 8
- ✅ Rename ProfessorPasswordPrompt — Task 9
- ✅ Comentar /reset-password — Task 10
- ✅ Smoke test E2E — Task 11
- ✅ Deploy Vercel — Task 11

**Placeholder scan:** Re-verifiquei e os trechos onde digo "manter o conteúdo existente do card" (Task 8 Step 6) deixam ambiguidade. Mitigação: a Task explicitly diz pra preservar o JSX atual com os botões Reset+Delete da Task 4, e dá um stub ilustrativo. Quem executa precisa abrir o arquivo e ver o estado real do card de user antes de aplicar. Risco médio mas aceitável (executor inteligente vai checar).

**Type consistency:**
- `setSuccessModal({variant, userName, email, tempPassword})` usado em Task 3 (criação), Task 4 (reset por userId), Task 8 (reset/delete por email). Mesma assinatura.
- Edge function `reset-password` aceita `{userId?, email?}` consistente.
- `useResponsaveis` retorna `Responsavel[]` com `alunos_count: number` consistente.

**Riscos remanescentes:**
- Task 8 Step 6 depende do executor preservar o card existente. Documentado.
- PostgREST `aluno_responsavel(count)` pode não funcionar como espero — Task 7 inclui fallback.
- "Confirm email" do Supabase é manual. Task 11 Step 1 explícito.
