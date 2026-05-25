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

function readFlag(storage: Storage | undefined, key: string): boolean {
    return typeof storage !== "undefined" && storage.getItem(key) === "true";
}

export function usePWAInstall(): PWAInstallState {
    const [platform] = useState<PWAPlatform>(detectPlatform);
    const [isStandalone, setIsStandalone] = useState<boolean>(detectStandalone);
    const [hasNativePrompt, setHasNativePrompt] = useState(false);
    const [dismissedForever, setDismissedForever] = useState<boolean>(() =>
        readFlag(typeof localStorage !== "undefined" ? localStorage : undefined, DISMISS_FOREVER_KEY),
    );
    const [dismissedSession, setDismissedSession] = useState<boolean>(() =>
        readFlag(typeof sessionStorage !== "undefined" ? sessionStorage : undefined, DISMISS_SESSION_KEY),
    );
    const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

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

    useEffect(() => {
        const handleFocus = () => setIsStandalone(detectStandalone());
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, []);

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

    return {
        platform,
        isStandalone,
        canShowModal,
        hasNativePrompt,
        triggerNativeInstall,
        dismissForever: () => {
            localStorage.setItem(DISMISS_FOREVER_KEY, "true");
            setDismissedForever(true);
        },
        dismissForSession: () => {
            sessionStorage.setItem(DISMISS_SESSION_KEY, "true");
            setDismissedSession(true);
        },
    };
}
