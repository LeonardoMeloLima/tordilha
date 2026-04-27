# Pendências de commit — Estância Tordilha PWA

Snapshot tirado em **2026-04-27** logo após o commit `ceb9572` (feat: Físico).
Todos os arquivos abaixo já estavam modificados/criados **antes** do trabalho de hoje
sobre o parâmetro Físico — eles não foram commitados nem incluídos no commit do Físico.

> **Aviso:** revisar e testar cada bloco antes de commitar. Pode haver mistura
> de coisas terminadas e coisas pela metade.

---

## Resumo numérico

- **28 arquivos modificados** (~1.810 inserções, ~765 deleções)
- **12 arquivos novos** (untracked) — componentes, hooks, assets

---

## Modificados — agrupados por feature

### 1. Auth / onboarding / aprovação de responsável
- `src/pages/Login.tsx` (+178 linhas) — provável reformulação do login
- `src/components/auth/ImageRightsForm.tsx` (+154) — termo de imagem
- `src/components/ProfileHeader.tsx` (+66) — header de perfil

### 2. Agenda e agendamentos (3 papéis)
- `src/components/gestor/GestorAgenda.tsx` (402 linhas alteradas)
- `src/components/pais/PaisAgenda.tsx` (423 linhas alteradas)
- `src/components/professor/ProfessorAgenda.tsx` (+208)
- `src/components/pais/NovoAgendamentoModal.tsx` (+29)
- `src/hooks/useSessoesRecorrentes.ts` (+17)

### 3. Gestor — dashboard / admin / cadastros
- `src/components/gestor/GestorAdminPanel.tsx` (+372)
- `src/components/gestor/GestorAlunos.tsx` (424 linhas alteradas)
- `src/components/gestor/GestorDashboard.tsx` (+135)
- `src/components/gestor/GestorCavalos.tsx` (+12)
- `src/components/gestor/GestorCreateNotification.tsx` (mudança pequena)

### 4. Aluno / pais / professor — telas de relacionamento
- `src/components/pais/PaisAlunoPerfil.tsx` (+12)
- `src/components/professor/ProfessorAlunos.tsx` (+23)
- `src/components/professor/ProfessorAvisos.tsx` (mudança pequena)
- `src/components/pais/MuralPostModal.tsx` (mudança pequena)

### 5. UI / infra
- `src/components/ui/ActionSheet.tsx` (+20)
- `src/components/ui/ImageUploadField.tsx` (+23)
- `src/components/BottomNav.tsx` (+13)
- `src/main.tsx` (+6) — provável registro de algo novo (PWA?)
- `src/pages/Index.tsx` (+32)

### 6. Hooks / data
- `src/hooks/useAlunos.ts` (mudança pequena)
- `src/hooks/useResponsavelAlunos.ts` (mudança pequena)

### 7. PWA / assets
- `index.html` (+5)
- `public/manifest.json` (+10)
- `public/icon-512.png` (binário)

### 8. Backend
- `supabase/functions/create-user/index.ts` — Edge Function de criação de usuário

---

## Arquivos novos (untracked)

### Componentes
- `src/components/pais/FalarComEstanciaModal.tsx` — feedback/contato dos pais
- `src/components/pais/PendingApprovalScreen.tsx` — tela de espera de aprovação
- `src/components/ui/PWAInstallBanner.tsx` — banner para instalar PWA

### Hooks
- `src/hooks/useFeedbacks.ts`
- `src/hooks/usePWAInstall.ts`
- `src/hooks/usePropostasHorario.ts` — propostas de horário (agenda)
- `src/hooks/useResponsaveisAprovados.ts`
- `src/hooks/useResponsaveisPendentes.ts`

### Lib
- `src/lib/scheduling.ts` — utilitários de agenda

### Assets PWA
- `public/Favicon.png`
- `public/apple-touch-icon.png`
- `public/icon-192.png`
- `src/assets/Favicon.png`

### Config
- `estancia-tordilha.code-workspace` (workspace do VSCode)

---

## Sugestão de plano para descommitar

Quando voltar a esses arquivos, dividir em commits temáticos:

1. **PWA setup** — manifest, icons, PWAInstallBanner, usePWAInstall, main.tsx
2. **Aprovação de responsáveis** — PendingApprovalScreen, useResponsaveisAprovados/Pendentes, Login
3. **Agenda + propostas de horário** — *Agenda.tsx, useSessoesRecorrentes, usePropostasHorario, scheduling.ts, NovoAgendamentoModal
4. **Gestor admin/dashboard** — GestorAdminPanel, GestorDashboard, GestorAlunos, GestorCavalos
5. **Feedback dos pais** — FalarComEstanciaModal, useFeedbacks
6. **Termo de imagem** — ImageRightsForm, ImageUploadField, ProfileHeader
7. **UI util** — ActionSheet, BottomNav, Index, ProfessorAvisos, MuralPostModal
8. **Edge function** — supabase/functions/create-user

Antes de cada commit, rodar `git diff <arquivo>` para revisar e `npx tsc --noEmit` no diretório `estancia-tordilha-pwa`.
