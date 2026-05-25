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
