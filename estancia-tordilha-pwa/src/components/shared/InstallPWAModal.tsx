import { useEffect, useState, type ReactNode } from "react";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { Smartphone, Share, PlusSquare, AlertTriangle, ChevronRight, MoreVertical, Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAuthSession } from "@/hooks/useAuthSession";

const OPEN_DELAY_MS = 1500;

function StepCard({
    number,
    title,
    mockup,
}: {
    number: number;
    title: ReactNode;
    mockup: ReactNode;
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
                    <div aria-hidden="true" className="bg-slate-200/60 rounded-lg px-2 py-1.5 flex items-center justify-around gap-2">
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
                    <div aria-hidden="true" className="bg-white rounded-lg px-2.5 py-2 flex items-center gap-2 ring-2 ring-blue-500 ring-offset-1 animate-pulse">
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
                    <div aria-hidden="true" className="bg-slate-100 rounded-lg px-2 py-1.5 flex items-center justify-between">
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

    // Fallback: Firefox/Samsung Browser ou Chrome sem engagement suficiente
    return (
        <div className="flex flex-col gap-3">
            <StepCard
                number={1}
                title={<>Toque no menu <span className="text-[#8B4513]">⋮</span> (canto superior direito)</>}
                mockup={
                    <div aria-hidden="true" className="bg-slate-100 rounded-lg px-2 py-1.5 flex items-center justify-end gap-2">
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
                    <div aria-hidden="true" className="bg-white rounded-lg px-2.5 py-2 flex items-center gap-2 ring-2 ring-blue-500 ring-offset-1 animate-pulse">
                        <Download size={16} strokeWidth={2} className="text-slate-700 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-800 flex-1">Instalar app</span>
                    </div>
                }
            />
        </div>
    );
}

export function InstallPWAModal() {
    const { session, loading } = useAuthSession();
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

    if (loading || !session) return null;
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
        try {
            await triggerNativeInstall();
        } finally {
            setOpen(false);
        }
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

                {platform === "ios" && <IOSSteps />}
                {platform === "android" && (
                    <AndroidSection
                        hasNativePrompt={hasNativePrompt}
                        onInstallClick={handleInstallClick}
                    />
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
