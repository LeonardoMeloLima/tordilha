# Modal "Instale o app" — guia de instalação PWA (iOS/Android)

**Data:** 2026-05-25
**Escopo:** PWA do Estância Tordilha (`estancia-tordilha-pwa/`)
**Status:** Aprovado pelo usuário, pronto pra implementação

---

## Problema

Usuários do app (especialmente responsáveis pelos alunos) acessam pelo navegador e nunca instalam o PWA na tela inicial. No iOS isso é especialmente doloroso porque **não existe** prompt nativo de instalação — o usuário precisa saber o caminho manual (Safari → Compartilhar → Adicionar à Tela de Início), que é completamente invisível.

No Android, o Chrome dispara o evento `beforeinstallprompt`, mas só se o site capturar e expor o gatilho — atualmente o app não faz isso.

**Resultado:** taxa de instalação baixíssima, usuário entra pelo browser toda vez, perde a experiência standalone.

## Objetivo

Criar um modal explicativo (com ramificação por plataforma) que:
- Aparece automaticamente pra usuários autenticados que ainda não instalaram
- No **iOS**: mostra passo-a-passo visual da instalação manual no Safari
- No **Android**: oferece botão "Instalar agora" que dispara o prompt nativo do Chrome
- Some sozinho quando o usuário instalar (detecção de standalone)
- Permite "não mostrar mais" pra quem só quer usar no browser

## Decisões de design (alinhadas com o usuário)

1. **Persistência:** aparece em **todo login** até o app detectar que foi instalado (modo standalone). Quando instalar, some automaticamente. Opção "não mostrar mais" disponível.
2. **Plataformas:** ramifica entre iOS (passo-a-passo manual) e Android (botão nativo via `beforeinstallprompt`). Desktop é ignorado.
3. **Roles:** aparece pra **todos os usuários autenticados** (gestor, professor, responsável). PWA é pra todo mundo.
4. **Sem scroll, máxima clareza visual:** cada passo vira um mini-mockup do que o usuário vê na tela dele (réplica visual do botão Compartilhar do Safari, do item de menu "Adicionar à Tela de Início", do botão azul "Adicionar"). Texto curto, foco em correspondência visual.

## Arquitetura

### 1. Novo hook: `src/hooks/usePWAInstall.ts`

Centraliza toda a lógica de detecção e gerenciamento:

```ts
type Platform = 'ios' | 'android' | 'desktop';

interface PWAInstallState {
  platform: Platform;
  isStandalone: boolean;
  canShowModal: boolean;
  hasNativePrompt: boolean;
  triggerNativeInstall: () => Promise<void>;
  dismissForever: () => void;
  dismissForSession: () => void;
}

export function usePWAInstall(): PWAInstallState;
```

**Responsabilidades:**
- Detecta plataforma via `navigator.userAgent`:
  - `iOS`: `/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream`
  - `Android`: `/Android/.test(ua)`
  - Resto: `desktop`
- Detecta `isStandalone`:
  - `(window.navigator as any).standalone === true` (iOS Safari)
  - `window.matchMedia('(display-mode: standalone)').matches` (demais)
- Registra listener global `beforeinstallprompt` no mount, guarda o evento em `useRef`, e marca `hasNativePrompt = true`. Listener é registrado **uma vez** quando o componente que usa o hook (que vive no `App.tsx`) monta.
- Listener `appinstalled` pra detectar instalação concluída e fechar o modal imediatamente.
- `canShowModal` = `(platform !== 'desktop') && !isStandalone && !dismissedForever && !dismissedSession`
- `triggerNativeInstall`: chama `event.prompt()` no evento capturado; se aceito, limpa o ref.
- `dismissForever`: seta `localStorage.setItem('pwa-install-dismissed-forever', 'true')`.
- `dismissForSession`: seta `sessionStorage.setItem('pwa-install-dismissed-session', 'true')`.

### 2. Novo componente: `src/components/shared/InstallPWAModal.tsx`

UI no padrão `ActionSheet` (mesmo wrapper visual do `WelcomeSheet`).

**Props:** nenhuma — consome o hook internamente.

**Estrutura JSX (alto nível):**

```tsx
<ActionSheet
  isOpen={open}
  onClose={handleDismissSession}
  title="Instale o app na tela inicial"
  subtitle="Acesso rápido como um aplicativo, sem precisar abrir o navegador"
>
  {platform === 'ios' ? <IOSSteps /> : <AndroidSection />}
  <Footer onDismissSession={...} onDismissForever={...} />
</ActionSheet>
```

**`<IOSSteps />` — sem scroll, ~560px total:**

1. **Banner amarelo no topo (~50px):** "⚠️ Use o **Safari**, não Chrome/Instagram/WhatsApp"
2. **Passo 1 (~110px):** número grande "1" + texto "Toque em **Compartilhar**" + mini-mockup visual da barra inferior do Safari com o ícone de share (`Share` do lucide-react) destacado com `ring-2 ring-blue-500 ring-offset-2` e animação `animate-pulse`.
3. **Passo 2 (~110px):** "2" + "Role e toque em **Adicionar à Tela de Início**" + mini-mockup de uma linha de menu com ícone `PlusSquare` + texto "Adicionar à Tela de Início" + chevron, destacada.
4. **Passo 3 (~110px):** "3" + "Toque em **Adicionar**" + mini-mockup do header "Adicionar à Tela de Início" com o botão azul "Adicionar" no canto direito, destacado.

**`<AndroidSection />`:**
- Se `hasNativePrompt === true`:
  - Botão grande primário (cor marrom `#8B4513`): "📲 Instalar app agora"
  - Texto secundário: "Vai aparecer uma confirmação do Chrome — toque em 'Instalar'"
- Se `hasNativePrompt === false` (fallback):
  - Passo 1: "Toque no menu **⋮** do Chrome (canto superior direito)"
  - Passo 2: "Selecione **Instalar app**"
  - Cada um com mini-mockup visual igual no iOS

**`<Footer />`:**
- Botão secundário ocupando largura: "Agora não" → chama `dismissForSession` + `onClose`
- Link `text-xs text-slate-500 underline` abaixo, centralizado: "Não mostrar mais" → chama `dismissForever` + `onClose`

**Detalhe de timing:** `setTimeout(() => setOpen(true), 1500)` no `useEffect` inicial. Delay de 1.5s pra não ser agressivo na primeira impressão pós-login.

### 3. Plug em `App.tsx`

Adicionar `<InstallPWAModal />` dentro do `<AuthProvider>` mas no nível raiz (irmão das rotas), pra que apareça em qualquer página autenticada sem precisar tocar nas pages.

O componente checa internamente se há usuário autenticado via `useAuth()` — se não houver, não renderiza nada.

## Comportamento detalhado

### Quando aparece
- Usuário autenticado
- `platform !== 'desktop'`
- `!isStandalone`
- `localStorage['pwa-install-dismissed-forever'] !== 'true'`
- `sessionStorage['pwa-install-dismissed-session'] !== 'true'`
- Delay de 1500ms após mount

### Quando some
- Usuário toca "Agora não" → fecha + marca sessão → reaparece no próximo login
- Usuário toca "Não mostrar mais" → fecha + marca localStorage → nunca mais
- Usuário toca "Instalar agora" (Android) e aceita → evento `appinstalled` dispara → fecha
- Usuário instala via Safari (iOS) → no próximo abrir, `isStandalone === true` → não aparece
- Usuário faz logout → componente desmonta (sem efeito colateral; sessionStorage some no fim da sessão do browser)

### Detecção de plataforma — casos de borda
- iOS dentro do app do Instagram/WhatsApp/Chrome: detecta como iOS mas o `beforeinstallprompt` não dispara nem o "Adicionar à Tela de Início" funciona corretamente. Por isso o **banner amarelo** alerta o usuário a abrir no Safari.
- Android Firefox/Samsung Browser: `beforeinstallprompt` pode não disparar → cai no fallback de passo-a-passo manual.
- iPadOS desktop mode: pode reportar UA de Mac e cair em `desktop`. Aceita-se essa limitação — usuário pode instalar via menu do Safari de qualquer forma.

## Estilo visual

Segue o design system do `WelcomeSheet`:
- Cor primária marrom: `#8B4513` (botões, ícones de destaque)
- Texto: `text-slate-700` / `text-slate-600` (`font-medium` / `font-bold`)
- Cards de passo: `bg-slate-50`, `rounded-2xl`, `border border-slate-100`
- Mini-mockups: replicar visualmente os controles reais (cores próximas do Safari/iOS), com destaque por `ring-2 ring-blue-500 ring-offset-2 animate-pulse` no elemento crítico.
- Banner de aviso Safari: `bg-amber-50`, `border-amber-200`, ícone `AlertTriangle`, `text-amber-900`

## Arquivos a criar/modificar

**Criar:**
- `estancia-tordilha-pwa/src/hooks/usePWAInstall.ts`
- `estancia-tordilha-pwa/src/components/shared/InstallPWAModal.tsx`

**Modificar:**
- `estancia-tordilha-pwa/src/App.tsx` — adicionar `<InstallPWAModal />` no nível raiz autenticado

**Sem mexer:**
- `manifest.json` já está configurado corretamente (display: standalone, ícones presentes)
- Páginas individuais (Login, Index, AguardandoAprovacao, etc.) — nada a alterar

## Critérios de sucesso

1. Em iOS Safari (não-standalone), modal aparece 1.5s após login com 3 passos visuais.
2. Em Android Chrome (não-standalone, com engagement suficiente), modal aparece com botão "Instalar agora" funcional que dispara o prompt nativo.
3. Após instalar via qualquer caminho, próximo acesso ao app **não** mostra mais o modal (detecção de standalone funciona).
4. "Não mostrar mais" persiste entre sessões (localStorage).
5. "Agora não" reaparece no próximo login (sessionStorage).
6. Desktop nunca vê o modal.
7. Conteúdo cabe em iPhone padrão (390x844) sem scroll interno.
8. Modal é dispensável tocando fora ou no X do `ActionSheet`.

## Fora do escopo (YAGNI)

- Tracking analítico de "instalou via modal" — não tem analytics no projeto hoje.
- Customização por role (mesmo modal pra todos).
- Botão "Instalar" persistente no header/perfil — usuário pediu B (auto), não D.
- Internacionalização — app é só PT-BR.
- Tutorial em vídeo / GIF animado — overkill, mockups estáticos resolvem.
