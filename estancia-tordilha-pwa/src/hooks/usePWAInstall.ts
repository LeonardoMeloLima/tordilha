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
    const [dismissedForever, setDismissedForever] = useState<boolean>(() =>
        readFlag(typeof localStorage !== "undefined" ? localStorage : undefined, DISMISS_FOREVER_KEY),
    );
    const [dismissedSession, setDismissedSession] = useState<boolean>(() =>
        readFlag(typeof sessionStorage !== "undefined" ? sessionStorage : undefined, DISMISS_SESSION_KEY),
    );

    useEffect(() => {
        const handleFocus = () => setIsStandalone(detectStandalone());
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, []);

    const canShowModal =
        platform !== "desktop" && !isStandalone && !dismissedForever && !dismissedSession;

    return {
        platform,
        isStandalone,
        canShowModal,
        hasNativePrompt: false,
        triggerNativeInstall: async () => {},
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
