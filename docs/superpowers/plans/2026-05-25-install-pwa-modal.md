# Modal Instalar PWA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um modal automático que ensina responsáveis (e qualquer usuário autenticado) a instalar o PWA na tela inicial — passo-a-passo visual no iOS, botão nativo "Instalar agora" no Android.

**Architecture:** Um hook (`usePWAInstall`) centraliza detecção de plataforma/standalone e captura do evento `beforeinstallprompt`. Um componente (`InstallPWAModal`) consome o hook e renderiza UI no padrão `ActionSheet`. Plug único em `App.tsx` no nível raiz autenticado.

**Tech Stack:** React 19, TypeScript, Tailwind, lucide-react, ActionSheet existente, hooks do React (`useState`, `useEffect`, `useRef`).

**Spec base:** [`docs/superpowers/specs/2026-05-25-install-pwa-modal-design.md`](../specs/2026-05-25-install-pwa-modal-design.md)

> **Sobre testes:** Projeto não tem infraestrutura de testes automatizados (sem Vitest/Jest). Cada task inclui passos de **verificação manual** com instruções específicas de DevTools (User-Agent override, Application > Manifest, console).

---

## Estrutura de Arquivos

**Criar:**
- `estancia-tordilha-pwa/src/hooks/usePWAInstall.ts` — hook central de detecção + captura do prompt
- `estancia-tordilha-pwa/src/components/shared/InstallPWAModal.tsx` — componente UI completo

**Modificar:**
- `estancia-tordilha-pwa/src/App.tsx` — montar `<InstallPWAModal />` no nível raiz, irmão das rotas

---

### Task 1: Criar hook `usePWAInstall` — detecção de plataforma e standalone

**Files:**
- Create: `estancia-tordilha-pwa/src/hooks/usePWAInstall.ts`

- [ ] **Step 1: Criar o arquivo do hook com detecção mínima**

Conteúdo completo do arquivo (versão inicial — só detecção; listeners vêm na Task 2):

```ts
import { useEffect, useState } from "react";

export type PWAPlatform = "ios" | "android" | "desktop";

export interface PWAInstallState {
    platform: PWAPlatform;
    isStandalone: boolean;
    canShowModal: boolean;
    hasNativePrompt: boolean;
    triggerNativeInstall: () => Promise<void>;
    dismissForever: () => void;
    dismissForSession: () => void;
}

const DISMISS_FOREVER_KEY = "pwa-install-dismissed-forever";
const DISMISS_SESSION_KEY = "pwa-install-dismissed-session";

function detectPlatform(): PWAPlatform {
    if (typeof navigator === "undefined") return "desktop";
    const ua = navigator.userAgent;
    // iOS: iPhone/iPad/iPod, excluindo Windows Phone (MSStream)
    if (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) {
        return "ios";
    }
    if (/Android/.test(ua)) return "android";
    return "desktop";
}

function detectStandalone(): boolean {
    if (typeof window === "undefined") return false;
    const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
    return iosStandalone || displayModeStandalone;
}

export function usePWAInstall(): PWAInstallState {
    const [platform] = useState<PWAPlatform>(detectPlatform);
    const [isStandalone, setIsStandalone] = useState<boolean>(detectStandalone);

    // Re-checa standalone quando a janela ganha foco (caso o usuário instale e volte)
    useEffect(() => {
        const handleFocus = () => setIsStandalone(detectStandalone());
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, []);

    const dismissedForever =
        typeof localStorage !== "undefined" &&
        localStorage.getItem(DISMISS_FOREVER_KEY) === "true";
    const dismissedSession =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(DISMISS_SESSION_KEY) === "true";

    const canShowModal =
        platform !== "desktop" && !isStandalone && !dismissedForever && !dismissedSession;

    return {
        platform,
        isStandalone,
        canShowModal,
        hasNativePrompt: false, // Task 2 implementa
        triggerNativeInstall: async () => {
            // Task 2 implementa
        },
        dismissForever: () => {
            localStorage.setItem(DISMISS_FOREVER_KEY, "true");
        },
        dismissForSession: () => {
            sessionStorage.setItem(DISMISS_SESSION_KEY, "true");
        },
    };
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd estancia-tordilha-pwa && npm run type-check`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add estancia-tordilha-pwa/src/hooks/usePWAInstall.ts
git commit -m "feat(pwa): hook usePWAInstall com detecção de plataforma e standalone"
```

---

### Task 2: Hook — adicionar captura de `beforeinstallprompt` + `appinstalled`

**Files:**
- Modify: `estancia-tordilha-pwa/src/hooks/usePWAInstall.ts`

- [ ] **Step 1: Adicionar listeners e ref pro evento capturado**

Substituir o conteúdo completo do arquivo por:

```ts
import { useEffect, useRef, useState } from "react";

export type PWAPlatform = "ios" | "android" | "desktop";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface PWAInstallState {
    platform: PWAPlatform;
    isStandalone: boolean;
    canShowModal: boolean;
    hasNativePrompt: boolean;
    triggerNativeInstall: () => Promise<void>;
    dismissForever: () => void;
    dismissForSession: () => void;
}

const DISMISS_FOREVER_KEY = "pwa-install-dismissed-forever";
const DISMISS_SESSION_KEY = "pwa-install-dismissed-session";

function detectPlatform(): PWAPlatform {
    if (typeof navigator === "undefined") return "desktop";
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) {
        return "ios";
    }
    if (/Android/.test(ua)) return "android";
    return "desktop";
}

function detectStandalone(): boolean {
    if (typeof window === "undefined") return false;
    const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
    return iosStandalone || displayModeStandalone;
}

export function usePWAInstall(): PWAInstallState {
    const [platform] = useState<PWAPlatform>(detectPlatform);
    const [isStandalone, setIsStandalone] = useState<boolean>(detectStandalone);
    const [hasNativePrompt, setHasNativePrompt] = useState(false);
    const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

    // Captura o evento beforeinstallprompt (só dispara uma vez por sessão no Chrome)
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            // Previne o banner automático do Chrome — queremos controle total
            e.preventDefault();
            promptEventRef.current = e as BeforeInstallPromptEvent;
            setHasNativePrompt(true);
        };

        const handleAppInstalled = () => {
            promptEventRef.current = null;
            setHasNativePrompt(false);
            setIsStandalone(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    // Re-checa standalone quando a janela ganha foco
    useEffect(() => {
        const handleFocus = () => setIsStandalone(detectStandalone());
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, []);

    const dismissedForever =
        typeof localStorage !== "undefined" &&
        localStorage.getItem(DISMISS_FOREVER_KEY) === "true";
    const dismissedSession =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(DISMISS_SESSION_KEY) === "true";

    const canShowModal =
        platform !== "desktop" && !isStandalone && !dismissedForever && !dismissedSession;

    const triggerNativeInstall = async () => {
        const event = promptEventRef.current;
        if (!event) return;
        await event.prompt();
        const choice = await event.userChoice;
        if (choice.outcome === "accepted") {
            promptEventRef.current = null;
            setHasNativePrompt(false);
        }
    };

    const dismissForever = () => {
        localStorage.setItem(DISMISS_FOREVER_KEY, "true");
    };

    const dismissForSession = () => {
        sessionStorage.setItem(DISMISS_SESSION_KEY, "true");
    };

    return {
        platform,
        isStandalone,
        canShowModal,
        hasNativePrompt,
        triggerNativeInstall,
        dismissForever,
        dismissForSession,
    };
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd estancia-tordilha-pwa && npm run type-check`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add estancia-tordilha-pwa/src/hooks/usePWAInstall.ts
git commit -m "feat(pwa): captura beforeinstallprompt e appinstalled no hook"
```

---

### Task 3: Criar shell do `InstallPWAModal` com ActionSheet + abertura controlada

**Files:**
- Create: `estancia-tordilha-pwa/src/components/shared/InstallPWAModal.tsx`

- [ ] **Step 1: Criar o componente com estrutura básica (sem conteúdo de passos ainda)**

Conteúdo completo do arquivo:

```tsx
import { useEffect, useState } from "react";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const OPEN_DELAY_MS = 1500;

export function InstallPWAModal() {
    const { platform, canShowModal, hasNativePrompt, triggerNativeInstall, dismissForever, dismissForSession } =
        usePWAInstall();
    const [open, setOpen] = useState(false);

    // Abre com delay após o componente montar (1.5s) — não agressivo no primeiro paint
    useEffect(() => {
        if (!canShowModal) {
            setOpen(false);
            return;
        }
        const t = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
        return () => clearTimeout(t);
    }, [canShowModal]);

    if (!canShowModal) return null;

    const handleDismissSession = () => {
        dismissForSession();
        setOpen(false);
    };

    const handleDismissForever = () => {
        dismissForever();
        setOpen(false);
    };

    const handleInstallClick = async () => {
        await triggerNativeInstall();
        setOpen(false);
    };

    return (
        <ActionSheet
            isOpen={open}
            onClose={handleDismissSession}
            title="Instale o app na tela inicial"
            subtitle="Acesso rápido como um aplicativo, sem precisar abrir o navegador"
        >
            <div className="flex flex-col gap-4 py-2">
                <div className="flex items-center gap-3 bg-[#8B4513]/5 p-4 rounded-2xl border border-[#8B4513]/10">
                    <div className="w-10 h-10 rounded-2xl bg-[#8B4513] flex items-center justify-center text-white shrink-0">
                        <Smartphone size={20} strokeWidth={2.5} />
                    </div>
                    <p className="text-sm text-slate-700 font-medium leading-snug">
                        Em <strong>poucos toques</strong> o app fica como um aplicativo de verdade no seu celular.
                    </p>
                </div>

                {/* Conteúdo por plataforma vem nas próximas tasks */}
                {platform === "ios" && (
                    <div className="text-sm text-slate-500 italic">Passos iOS — placeholder</div>
                )}
                {platform === "android" && (
                    <div className="text-sm text-slate-500 italic">
                        Seção Android — placeholder (hasNativePrompt={String(hasNativePrompt)})
                    </div>
                )}

                {/* Botão Android (preview) */}
                {platform === "android" && hasNativePrompt && (
                    <button
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full bg-[#8B4513] hover:bg-[#7a3d10] active:scale-[0.98] transition-all text-white font-black py-4 rounded-2xl text-base"
                    >
                        Instalar app agora
                    </button>
                )}

                {/* Footer ações */}
                <div className="flex flex-col gap-2 pt-2">
                    <button
                        type="button"
                        onClick={handleDismissSession}
                        className="w-full bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all text-slate-700 font-bold py-3 rounded-2xl text-sm"
                    >
                        Agora não
                    </button>
                    <button
                        type="button"
                        onClick={handleDismissForever}
                        className="text-xs text-slate-500 underline hover:text-slate-700 transition-colors py-1"
                    >
                        Não mostrar mais
                    </button>
                </div>
            </div>
        </ActionSheet>
    );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd estancia-tordilha-pwa && npm run type-check`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add estancia-tordilha-pwa/src/components/shared/InstallPWAModal.tsx
git commit -m "feat(pwa): shell do InstallPWAModal com ActionSheet e botões base"
```

---

### Task 4: Implementar os 3 passos visuais do iOS

**Files:**
- Modify: `estancia-tordilha-pwa/src/components/shared/InstallPWAModal.tsx`

- [ ] **Step 1: Adicionar componentes auxiliares e substituir o placeholder iOS**

No topo do arquivo (após os imports), adicionar import dos ícones extras:

```tsx
import { Smartphone, Share, PlusSquare, AlertTriangle, ChevronRight } from "lucide-react";
```

Adicionar **antes** do `export function InstallPWAModal()` os subcomponentes:

```tsx
function StepCard({
    number,
    title,
    mockup,
}: {
    number: number;
    title: React.ReactNode;
    mockup: React.ReactNode;
}) {
    return (
        <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-[#8B4513] text-white font-black text-lg flex items-center justify-center shrink-0">
                {number}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-800 leading-tight mb-1.5">{title}</p>
                {mockup}
            </div>
        </div>
    );
}

function IOSSteps() {
    return (
        <div className="flex flex-col gap-3">
            {/* Banner Safari obrigatório */}
            <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 p-3 rounded-2xl">
                <AlertTriangle size={18} strokeWidth={2.5} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 font-bold leading-snug">
                    Só funciona no <strong>Safari</strong>. Se abriu por Chrome/Instagram/WhatsApp,
                    toque em <span className="font-black">•••</span> e escolha <strong>"Abrir no Safari"</strong>.
                </p>
            </div>

            <StepCard
                number={1}
                title={<>Toque em <span className="text-[#8B4513]">Compartilhar</span></>}
                mockup={
                    <div className="bg-slate-200/60 rounded-lg px-2 py-1.5 flex items-center justify-around gap-2">
                        <div className="w-5 h-5 rounded bg-slate-300/80" />
                        <div className="w-7 h-7 rounded-md bg-white ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-200 flex items-center justify-center animate-pulse">
                            <Share size={14} strokeWidth={2.5} className="text-blue-500" />
                        </div>
                        <div className="w-5 h-5 rounded bg-slate-300/80" />
                        <div className="w-5 h-5 rounded bg-slate-300/80" />
                    </div>
                }
            />

            <StepCard
                number={2}
                title={<>Role e toque em <span className="text-[#8B4513]">Adicionar à Tela de Início</span></>}
                mockup={
                    <div className="bg-white rounded-lg px-2.5 py-2 flex items-center gap-2 ring-2 ring-blue-500 ring-offset-1 animate-pulse">
                        <PlusSquare size={16} strokeWidth={2} className="text-slate-700 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-800 flex-1">Adicionar à Tela de Início</span>
                        <ChevronRight size={14} className="text-slate-400" />
                    </div>
                }
            />

            <StepCard
                number={3}
                title={<>Toque em <span className="text-[#8B4513]">Adicionar</span> (canto superior direito)</>}
                mockup={
                    <div className="bg-slate-100 rounded-lg px-2 py-1.5 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">Cancelar</span>
                        <span className="text-[10px] text-slate-700 font-bold">Tela de Início</span>
                        <span className="text-[11px] text-white font-black bg-blue-500 px-2 py-0.5 rounded ring-2 ring-blue-500 ring-offset-1 animate-pulse">
                            Adicionar
                        </span>
                    </div>
                }
            />
        </div>
    );
}
```

- [ ] **Step 2: Substituir o placeholder iOS no JSX**

Trocar este bloco:

```tsx
                {platform === "ios" && (
                    <div className="text-sm text-slate-500 italic">Passos iOS — placeholder</div>
                )}
```

Por:

```tsx
                {platform === "ios" && <IOSSteps />}
```

- [ ] **Step 3: Verificar tipos**

Run: `cd estancia-tordilha-pwa && npm run type-check`
Expected: sem erros.

- [ ] **Step 4: Smoke test visual no DevTools**

```bash
cd estancia-tordilha-pwa && npm run dev
```

No Chrome DevTools:
1. Abrir o app, fazer login.
2. Abrir DevTools (F12) → ícone de device toolbar → escolher "iPhone 14 Pro" ou similar.
3. No menu de 3 pontos do device toolbar → "Show device frame".
4. Limpar `localStorage` e `sessionStorage` (Application tab).
5. Em "Network conditions" → User agent → marcar "Custom" e colar:
   `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1`
6. Recarregar → após 1.5s o modal deve aparecer com banner amarelo + 3 cards visuais.

Expected:
- Banner amarelo de aviso Safari visível
- 3 step cards visíveis sem scroll interno
- Mockups visuais com pulse no elemento crítico (botão share, item de menu, botão "Adicionar")
- Botão "Agora não" + link "Não mostrar mais" visíveis no rodapé

- [ ] **Step 5: Commit**

```bash
git add estancia-tordilha-pwa/src/components/shared/InstallPWAModal.tsx
git commit -m "feat(pwa): passos visuais iOS (3 cards + banner Safari)"
```

---

### Task 5: Implementar seção Android (botão nativo + fallback)

**Files:**
- Modify: `estancia-tordilha-pwa/src/components/shared/InstallPWAModal.tsx`

- [ ] **Step 1: Adicionar o subcomponente `<AndroidSection />`**

Adicionar import extra:

```tsx
import { Smartphone, Share, PlusSquare, AlertTriangle, ChevronRight, MoreVertical, Download } from "lucide-react";
```

Adicionar **antes** do `export function InstallPWAModal()` (depois do `IOSSteps`):

```tsx
function AndroidSection({
    hasNativePrompt,
    onInstallClick,
}: {
    hasNativePrompt: boolean;
    onInstallClick: () => void;
}) {
    if (hasNativePrompt) {
        return (
            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    onClick={onInstallClick}
                    className="w-full bg-[#8B4513] hover:bg-[#7a3d10] active:scale-[0.98] transition-all text-white font-black py-5 rounded-2xl text-base flex items-center justify-center gap-3 shadow-lg shadow-[#8B4513]/20"
                >
                    <Download size={22} strokeWidth={2.5} />
                    Instalar app agora
                </button>
                <p className="text-xs text-slate-500 font-medium text-center px-2 leading-snug">
                    Vai aparecer uma confirmação do Chrome — é só tocar em <strong>"Instalar"</strong>.
                </p>
            </div>
        );
    }

    // Fallback: usuário usa Firefox/Samsung Browser ou Chrome sem engagement suficiente
    return (
        <div className="flex flex-col gap-3">
            <StepCard
                number={1}
                title={<>Toque no menu <span className="text-[#8B4513]">⋮</span> (canto superior direito)</>}
                mockup={
                    <div className="bg-slate-100 rounded-lg px-2 py-1.5 flex items-center justify-end gap-2">
                        <div className="w-4 h-4 rounded bg-slate-300/70" />
                        <div className="w-7 h-7 rounded-md bg-white ring-2 ring-blue-500 ring-offset-1 flex items-center justify-center animate-pulse">
                            <MoreVertical size={14} strokeWidth={2.5} className="text-slate-700" />
                        </div>
                    </div>
                }
            />
            <StepCard
                number={2}
                title={<>Selecione <span className="text-[#8B4513]">Instalar app</span></>}
                mockup={
                    <div className="bg-white rounded-lg px-2.5 py-2 flex items-center gap-2 ring-2 ring-blue-500 ring-offset-1 animate-pulse">
                        <Download size={16} strokeWidth={2} className="text-slate-700 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-800 flex-1">Instalar app</span>
                    </div>
                }
            />
        </div>
    );
}
```

- [ ] **Step 2: Substituir o bloco antigo do Android no JSX**

Trocar este trecho:

```tsx
                {platform === "android" && (
                    <div className="text-sm text-slate-500 italic">
                        Seção Android — placeholder (hasNativePrompt={String(hasNativePrompt)})
                    </div>
                )}

                {/* Botão Android (preview) */}
                {platform === "android" && hasNativePrompt && (
                    <button
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full bg-[#8B4513] hover:bg-[#7a3d10] active:scale-[0.98] transition-all text-white font-black py-4 rounded-2xl text-base"
                    >
                        Instalar app agora
                    </button>
                )}
```

Por:

```tsx
                {platform === "android" && (
                    <AndroidSection
                        hasNativePrompt={hasNativePrompt}
                        onInstallClick={handleInstallClick}
                    />
                )}
```

- [ ] **Step 3: Verificar tipos**

Run: `cd estancia-tordilha-pwa && npm run type-check`
Expected: sem erros.

- [ ] **Step 4: Smoke test visual no DevTools (Android UA)**

```bash
cd estancia-tordilha-pwa && npm run dev
```

No Chrome DevTools:
1. Limpar `localStorage` + `sessionStorage`.
2. User agent custom: `Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36`
3. Recarregar → ver o modal abrir após 1.5s.
4. Como `beforeinstallprompt` só dispara em conexão real com manifest válido + engagement, o fallback (2 step cards) deve aparecer.

Expected: 2 step cards visíveis (menu ⋮ + "Instalar app") sem scroll.

> **Nota:** Pra testar o botão nativo "Instalar app agora", precisa de Android Chrome real com o site servido em HTTPS — não dá no DevTools.

- [ ] **Step 5: Commit**

```bash
git add estancia-tordilha-pwa/src/components/shared/InstallPWAModal.tsx
git commit -m "feat(pwa): seção Android com botão nativo e fallback de passos manuais"
```

---

### Task 6: Plugar `<InstallPWAModal />` em `App.tsx`

**Files:**
- Modify: `estancia-tordilha-pwa/src/App.tsx`

- [ ] **Step 1: Importar e montar o componente no nível raiz**

Adicionar import no topo (após o último import existente):

```tsx
import { InstallPWAModal } from "@/components/shared/InstallPWAModal";
```

Dentro do JSX do `App`, adicionar `<InstallPWAModal />` **dentro** do `<BrowserRouter>` e **dentro** do `<Suspense>` mas **fora** das `<Routes>`, pra que viva em qualquer página:

Substituir:

```tsx
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Carregando...</div>}>
            <Routes>
```

Por:

```tsx
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Carregando...</div>}>
            <InstallPWAModal />
            <Routes>
```

> **Por que aqui:** o modal precisa do `BrowserRouter` pra renderizar como overlay sobre qualquer rota, e estar **fora** do `<Routes>` garante que ele não é desmontado a cada navegação. O componente checa `canShowModal` internamente — se não estiver autenticado, na verdade ainda renderiza o modal (porque ele não conhece auth). Isso é OK: na tela de login o modal **também** vai aparecer no iOS/Android se o usuário ficar parado lá 1.5s. Decisão do spec aceita isso (PWA é pra todo mundo, incluindo antes de logar).

- [ ] **Step 2: Verificar tipos e build**

Run: `cd estancia-tordilha-pwa && npm run type-check && npm run build`
Expected: type-check passa, build conclui sem erros.

- [ ] **Step 3: Smoke test desktop (não deve aparecer)**

```bash
cd estancia-tordilha-pwa && npm run dev
```

No Chrome **sem** mudar user agent:
1. Limpar storage.
2. Abrir o app.
3. Esperar ≥ 3 segundos.

Expected: modal **NÃO** aparece (platform === "desktop").

- [ ] **Step 4: Smoke test iOS pelo DevTools**

Mesma sequência da Task 4 Step 4 — UA iPhone, recarregar, esperar 1.5s.

Expected: modal aparece em qualquer rota (testa em `/` e em `/login`).

- [ ] **Step 5: Commit**

```bash
git add estancia-tordilha-pwa/src/App.tsx
git commit -m "feat(pwa): monta InstallPWAModal no nível raiz do App"
```

---

### Task 7: Smoke test completo dos fluxos de dispensa

**Files:** nenhum (apenas verificação)

- [ ] **Step 1: Rodar o dev server**

```bash
cd estancia-tordilha-pwa && npm run dev
```

- [ ] **Step 2: Testar fluxo "Agora não" (sessionStorage)**

UA iPhone. Limpar storage. Recarregar:
1. Modal abre após 1.5s.
2. Tocar "Agora não" → modal fecha.
3. Recarregar (F5).
4. Expected: modal **NÃO** reabre na mesma aba (sessionStorage marcado).
5. Fechar a aba e abrir nova com mesmo UA.
6. Expected: modal **reabre** após 1.5s (sessionStorage zerado).

- [ ] **Step 3: Testar fluxo "Não mostrar mais" (localStorage)**

Limpar storage. Recarregar:
1. Modal abre.
2. Tocar "Não mostrar mais" → modal fecha.
3. Fechar a aba, abrir nova.
4. Recarregar.
5. Expected: modal **NÃO** abre (localStorage persiste).
6. Limpar localStorage manualmente no DevTools → recarregar.
7. Expected: modal volta a abrir.

- [ ] **Step 4: Testar fluxo "tocar fora pra fechar"**

Limpar storage. Recarregar:
1. Modal abre.
2. Tocar no backdrop escuro fora do modal.
3. Expected: modal fecha (equivale a "Agora não" — `onClose` dispara `dismissForSession`).
4. Recarregar.
5. Expected: modal **NÃO** reabre.

- [ ] **Step 5: Testar standalone (modal não aparece se já instalado)**

Limpar storage. Forçar standalone no DevTools:
1. Application tab → Manifest → "Add to homescreen" (Chrome).
2. Ou injetar manualmente no console **antes** de recarregar:
   ```js
   Object.defineProperty(window.navigator, "standalone", { value: true, writable: false });
   ```
3. Recarregar a página.
4. Expected: modal **NÃO** abre (mesmo com UA iOS).

- [ ] **Step 6: Marcar todos os fluxos como OK**

Se algum não passou, voltar pra task relevante e corrigir antes do commit final.

- [ ] **Step 7: Commit (sem alterações — só smoke test passou)**

Não há mudanças de código; pular o commit.

---

### Task 8: Sanity check final no Index — modal coexiste com ProtectedRoute

**Files:** nenhum (apenas verificação)

- [ ] **Step 1: Smoke test no fluxo autenticado real**

```bash
cd estancia-tordilha-pwa && npm run dev
```

UA iPhone. Limpar storage:
1. Logar com um usuário real (responsável, ativo).
2. Após carregar `/`, esperar 1.5s.
3. Expected: modal abre por cima do conteúdo do Index sem quebrar layout.
4. Tocar "Agora não" → modal fecha, conteúdo do Index continua funcional.
5. Navegar pra `/pais/solicitacoes` (ou outra rota protegida).
6. Expected: modal **NÃO** reabre durante a navegação (sessionStorage).

- [ ] **Step 2: Smoke test no fluxo "aguardando aprovação"**

UA iPhone. Limpar storage:
1. Logar com um usuário responsável com `status='pendente'` (tela `AguardandoAprovacao`).
2. Esperar 1.5s.
3. Expected: modal abre por cima da tela de aguardando aprovação.
4. Fechar com "Agora não".
5. Expected: tela de aguardando continua funcional.

- [ ] **Step 3: Smoke test no fluxo gestor**

UA Android. Limpar storage:
1. Logar como gestor.
2. Expected: modal abre no Android com botão "Instalar app agora" (ou fallback de passos).
3. Fechar com "Agora não".

Se todos passaram, plano completo.

---

## Self-Review

**Cobertura do spec:**
- Persistência (B do brainstorming): ✓ Task 1 (canShowModal lógica) + Task 7 (smoke test standalone)
- Ramificação iOS/Android (A do brainstorming): ✓ Tasks 4 e 5
- Todos os roles (C do brainstorming): ✓ Task 6 (montado no nível raiz, sem checagem de role); Task 8 (smoke test em 3 roles)
- Sem scroll, máxima clareza visual: ✓ Task 4 (3 cards iOS + banner) + Task 5 (Android com 1 botão ou 2 cards)
- Hook centralizado: ✓ Tasks 1+2
- "Não mostrar mais": ✓ Task 3 (footer) + Task 7 (smoke test localStorage)
- Banner Safari: ✓ Task 4
- Botão nativo Android via beforeinstallprompt: ✓ Tasks 2 + 5
- Delay 1.5s: ✓ Task 3
- Detecção de plataforma: ✓ Task 1

**Placeholders:** nenhum TBD/TODO/handle edge cases. Todo código mostrado integralmente.

**Consistência de tipos:**
- `PWAPlatform` = `"ios" | "android" | "desktop"` — usado consistente em Tasks 1, 2, 3, 4, 5.
- `PWAInstallState` — interface estável entre Tasks 1 e 2 (Task 2 só implementa o que Task 1 deixou stub).
- `BeforeInstallPromptEvent` — definido na Task 2.
- `StepCard` props (`number: number`, `title: ReactNode`, `mockup: ReactNode`) — usados consistente em Tasks 4 e 5.
- Storage keys (`pwa-install-dismissed-forever`, `pwa-install-dismissed-session`) — definidos na Task 1, referenciados consistentemente na Task 7.
