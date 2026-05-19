# Design: Eliminar fluxo de email — gestor gerencia senhas no app

- **Data**: 2026-05-11
- **Autor**: Leonardo Melo (brainstorm com Claude)
- **Status**: aprovado em brainstorm, aguardando revisão final do spec

## Contexto

Hoje o app depende de email em três fluxos:

1. **Criação de terapeuta/gestor**: edge function `create-user` cria o user com senha padrão `Tordilha@2026` e envia um welcome email via Resend (`from: onboarding@resend.dev`) contendo a senha em texto puro.
2. **Cadastro de responsável (pais)**: self-signup via `supabase.auth.signUp` na tela de Login. Comportamento depende da config "Confirm email" do projeto Supabase.
3. **Recuperação de senha**: botão "Esqueceu sua senha? Recuperar" no Login → `supabase.auth.resetPasswordForEmail` → magic link → rota `/reset-password`.

O cliente tem baixo apetite por investimento no app. O `onboarding@resend.dev` (sandbox do Resend) tem reputação ruim e alto risco de cair no spam, e adquirir/configurar um domínio próprio não é prioritário. Decisão: **eliminar email do app completamente**. Toda gestão de credenciais passa pelo gestor, dentro da própria interface.

## Objetivo

Remover (comentando, não deletando) toda dependência de email do app, substituindo por:

- **Criação**: gestor cria → senha temporária `Tordilha@2026` exibida na tela com botão "Copiar" → gestor repassa por canal externo (WhatsApp/voz).
- **Reset**: gestor reseta a senha de qualquer user no painel Admin → mesma tela "senha temporária + copiar".
- **Cadastro de responsável**: continua self-signup, mas com "Confirm email" desligado no Supabase → cadastrou, já entra.
- **Recuperação**: link "Esqueceu sua senha?" no Login vira texto estático "Procure o gestor da Estância.".

Em todos os casos onde o user recebe `Tordilha@2026`, o `raw_user_meta_data.needs_password_change = true` força o modal de troca obrigatória no próximo login.

## Fora de escopo

- Adquirir domínio próprio para Resend.
- Refatorar o fluxo de invite para usar `supabase.auth.admin.inviteUserByEmail` (magic link nativo).
- Endurecer segurança da edge function (`verify_jwt: false` permanece — qualquer caller com a URL pode invocar). Dívida documentada, não fixada aqui.
- Migrar usuários existentes (todos continuam funcionando; só novas criações e novos resets seguem o novo fluxo).
- Remover de fato (deletar arquivos) o `ResetPassword.tsx` e a rota `/reset-password`. Preferência do usuário: **comentar**, não apagar.

## Princípio de remoção de código

Quando uma feature sai do fluxo, **comentar** com cabeçalho explicando data e motivo, exemplo:

```ts
/* Desativado em 2026-05-11 — fluxo migrado para gestor gerencia senhas (sem email).
   Para religar: descomentar este bloco e a chamada em xyz. */
```

Aplica a: bloco Resend na edge function, lógica `forgotPassword` no `Login.tsx`, rota `/reset-password`, body do `ResetPassword.tsx`.

## Detalhe por fluxo

### A. Criação de terapeuta/gestor

**Onde:** painel "Administração" (existe). Modal "Novo Terapeuta" / "Novo Gestor" (existe).

**Mudanças no modal:**

- Card azul "Senha temporária" — texto atualizado para:
  > "Senha temporária: `Tordilha@2026`. Anote e compartilhe com o terapeuta. No primeiro acesso, ele será obrigado a definir uma nova senha."
- Adicionar botão **"📋 Copiar senha"** logo abaixo do card (copia `Tordilha@2026` pro clipboard via `navigator.clipboard.writeText`).
- Texto do botão de submit: "Convidar Terapeuta" → "**Criar Terapeuta**" (e equivalente pra "Criar Gestor").

**Após submit (sucesso):**

- Em vez do toast curto atual, abrir um `ActionSheet` (componente que o projeto já usa) reusável `<TempPasswordSuccessModal />`:
  ```
  ✅ Terapeuta João criado

  E-mail:           joao@example.com
  Senha temporária: Tordilha@2026   [📋 Copiar]

  ⚠️ Anote ou copie agora. Compartilhe com o terapeuta por
  WhatsApp ou pessoalmente. Ele vai ser obrigado a definir
  uma nova senha no primeiro acesso.

                   [Entendi]
  ```

**Mudanças na edge function `create-user`:**

- Bloco Resend (~ linhas 75-120 atuais) e template HTML: **comentados** com cabeçalho de motivo/data.
- Caso "usuário já existe" (linhas 49-65): **bloquear** com erro descritivo:
  > "Este e-mail já tem cadastro. Use 'Resetar senha' do usuário existente."
- Resposta continua incluindo `tempPassword` (já implementado v20).

### B. Self-signup do responsável

**Mudança principal**: setting do Supabase **Authentication → Sign In/Up → "Confirm email"** desligado (clique manual no dashboard, não automatizável via MCP até onde se sabe).

**Resultado**: `supabase.auth.signUp(...)` retorna `data.session` imediatamente. Front (que já navega pra `/` quando há session) funciona sem mudança.

**Limpeza no `Login.tsx`:**

- Comentar `emailRedirectTo: window.location.origin` (linha 104) — vira código morto.
- Toast atual ("Conta criada com sucesso! Agora você já pode fazer o seu login.") já não menciona email; mantém.

### C. Reset de senha pelo gestor

**Onde:** mesma tela "Administração". Cada card de usuário (terapeuta, gestor, responsável) ganha botão **"🔑 Resetar"** antes do "🗑 Excluir".

**Fluxo:**

1. Gestor clica em "🔑 Resetar" no card.
2. Dialog `confirm()` (padrão que o delete já usa):
   > "Resetar senha de João Silva (joao@x.com)? A senha atual será substituída por Tordilha@2026. Ele será obrigado a definir uma nova senha no próximo login. [Cancelar] [Sim, resetar]"
3. Confirmou → chama `create-user` action `reset-password` passando `userId` ou `email`.
4. Edge function:
   - Proteção super admin (`leonardo.informatica@gmail.com`): mesma lógica do delete (throw).
   - `auth.admin.updateUserById(targetId, { password: TEMP_PASSWORD, user_metadata: { ...prev, needs_password_change: true } })`.
   - Retorna `{ message, tempPassword: TEMP_PASSWORD }`.
5. Sucesso → mesmo `<TempPasswordSuccessModal />` da criação.

**Aceita `userId` OU `email` como input**: simplifica o caso do responsável, onde o front tem o email mas não necessariamente o `auth.users.id`. Se os dois forem fornecidos, `userId` prevalece. Se só `email`, edge function resolve via `auth.admin.listUsers().find(u => u.email === email)`. Se nenhum, retorna erro.

### D. Recuperação de senha (Login → "Esqueceu sua senha?")

- Botão "Esqueceu sua senha? Recuperar" no Login.tsx: substituído por **texto estático** "Esqueceu? Procure o gestor da Estância." (sem ação, só info).
- Modo `forgotPassword` do componente (lógica em `handleAuth` ~ linhas 56-66, e o estado `mode === "forgotPassword"`): **comentado** com cabeçalho.
- Rota `/reset-password` no roteador: **comentada**.
- `src/pages/ResetPassword.tsx`: body **comentado**, deixar um stub que faz `<Navigate to="/" replace />` (caso alguém abra o link antigo de email enviado historicamente).

### E. Aba "Responsáveis" no painel Admin

- 3ª aba ao lado de "Terapeutas" e "Gestores".
- **Sem botão "Novo Responsável"** — criação é self-service via signup.
- Card mostra: avatar/inicial, nome, email, quantidade de alunos vinculados (count em `aluno_responsavel`), botões `[🔑 Resetar]` `[🗑 Excluir]`.
- Listagem via novo hook `useResponsaveis` (`select * from responsaveis`).
- Reset/delete: enviam `email` pra edge function (que resolve `userId` internamente via `auth.admin.listUsers()` ou semelhante).

### F. Modal `ProfessorPasswordPrompt` → `FirstAccessPasswordPrompt`

- Renomear arquivo: `src/components/professor/ProfessorPasswordPrompt.tsx` → `src/components/auth/FirstAccessPasswordPrompt.tsx` (mover para pasta `auth/` que já existe).
- Renomear export: `ProfessorPasswordPrompt` → `FirstAccessPasswordPrompt`.
- Atualizar import e uso em `src/pages/Index.tsx` (linhas 20 e 149).
- Garantir que o componente é renderizado também na visão `role === 'pais'` (hoje só renderiza pra professor, possivelmente — confirmar durante implementação).

## Arquivos afetados

| Tipo | Arquivo | Mudança |
|---|---|---|
| EDIT | `supabase/functions/create-user/index.ts` | Router de actions, nova action `reset-password`, comenta Resend, bloqueia create de email existente |
| NEW | `src/components/gestor/TempPasswordSuccessModal.tsx` | ActionSheet reusável (criação + reset) |
| EDIT | `src/components/gestor/GestorAdminPanel.tsx` | 3ª aba, botão Reset, troca toast por modal, dialog, copy button |
| NEW | `src/hooks/useResponsaveis.ts` | Query responsáveis + count |
| EDIT | `src/pages/Login.tsx` | Texto estático "Esqueceu?", comenta `forgotPassword` e `emailRedirectTo` |
| EDIT | `src/pages/Index.tsx` | Renomeia import, garante uso pra todos roles |
| MOVE | `src/components/professor/ProfessorPasswordPrompt.tsx` → `src/components/auth/FirstAccessPasswordPrompt.tsx` | Rename + move |
| EDIT | (router — `App.tsx` ou similar) | Comenta rota `/reset-password` |
| EDIT | `src/pages/ResetPassword.tsx` | Body comentado + stub `<Navigate to="/" />` |
| MANUAL | Supabase Dashboard | Authentication → "Confirm email" → OFF |

## Ordem de implementação

1. Edge function v21 — router + nova action + Resend comentado. Deploy.
2. Verificar via curl: chamar `reset-password` direto, conferir que senha foi resetada.
3. Criar `<TempPasswordSuccessModal />` isolado.
4. `GestorAdminPanel` parte 1: trocar toast por modal no fluxo de criação (sem responsáveis).
5. Botão Reset + dialog + integração nas abas Terapeutas/Gestores.
6. Atualizar `Login.tsx` (texto estático + comentários).
7. Criar `useResponsaveis`.
8. `GestorAdminPanel` parte 2: 3ª aba "Responsáveis" + reset wireado.
9. Renomear `ProfessorPasswordPrompt` → `FirstAccessPasswordPrompt` + ajustar `Index.tsx` (garantir uso pra pais).
10. Comentar roteador (`/reset-password`) + body de `ResetPassword.tsx`.
11. **Manual no Supabase Dashboard**: desligar "Confirm email".
12. Smoke test E2E (criar → login com senha padrão → troca obrigatória → login com nova; reset → mesmo fluxo; signup pais → entra direto).
13. Build + Vercel `--prod`.

## Riscos / unknowns

- **Estrutura da tabela `responsaveis`**: confirmar se tem `auth_user_id` ou só email. Hipótese: só email (vi no código atual do signup). Mitigação: edge function aceita `email` e resolve.
- **RLS em `responsaveis`**: gestor consegue dar `SELECT` em todos? Verificar no início da implementação.
- **`FirstAccessPasswordPrompt` renderizado pra `pais`**: hoje só na visão professor. Garantir que `Index.tsx` renderiza independente do role.
- **Manual no Supabase**: depende de o usuário fazer o clique. Implementação fica meio inerte até esse passo. Sequência: deploy de tudo → última coisa é desligar o setting.

## Dívidas técnicas conhecidas e não tratadas

- `verify_jwt: false` na edge function (qualquer caller cria/deleta/reseta users).
- Senha `Tordilha@2026` hardcoded e única pra todos.
- `RESEND_API_KEY` ficará setada no Supabase mas sem uso (limpar depois).

## Critério de aceitação

- [ ] Gestor cria terapeuta → modal de sucesso mostra `Tordilha@2026` com botão copiar.
- [ ] Gestor cria gestor → mesmo fluxo.
- [ ] Gestor reseta senha de terapeuta → modal de sucesso.
- [ ] Gestor reseta senha de responsável (aba nova) → modal de sucesso.
- [ ] Terapeuta loga com `Tordilha@2026` → modal obrigatório força troca.
- [ ] Responsável faz signup → entra direto sem confirmar email.
- [ ] Botão "Esqueceu sua senha?" no Login virou texto estático.
- [ ] Nenhum email é enviado em qualquer fluxo (verificar logs Resend e Auth do Supabase).
- [ ] Tentativa de criar user com email já cadastrado retorna erro descritivo.
