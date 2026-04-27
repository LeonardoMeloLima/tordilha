import { useState, useEffect } from "react";

interface UsePWAInstallResult {
  isStandalone: boolean;
  isIOS: boolean;
  isIOSSafari: boolean;
  canInstallAndroid: boolean;
  installAndroid: () => Promise<void>;
}

export function usePWAInstall(): UsePWAInstallResult {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  const isIOSSafari =
    isIOS &&
    /safari/i.test(window.navigator.userAgent) &&
    !/crios|fxios|opios|mercury/i.test(window.navigator.userAgent);

  // Verifica se já havia um prompt capturado antes do React montar
  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    () => (window as any).__pwaInstallPrompt ?? null
  );
  const [canInstallAndroid, setCanInstallAndroid] = useState(
    () => !!(window as any).__pwaInstallPrompt
  );

  useEffect(() => {
    // Também escuta caso o evento chegue depois da montagem
    const handler = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
      setDeferredPrompt(e);
      setCanInstallAndroid(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const onAppInstalled = () => {
      (window as any).__pwaInstallPrompt = null;
      setDeferredPrompt(null);
      setCanInstallAndroid(false);
    };
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const installAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      (window as any).__pwaInstallPrompt = null;
      setDeferredPrompt(null);
      setCanInstallAndroid(false);
    }
  };

  return { isStandalone, isIOS, isIOSSafari, canInstallAndroid, installAndroid };
}
