import { useState } from "react";
import { X, Share, Smartphone, Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { ActionSheet } from "@/components/ui/ActionSheet";
import logoMarrom from "@/assets/logo-marrom.png";

export function PWAInstallBanner() {
  const { isStandalone, isIOS, isIOSSafari, canInstallAndroid, installAndroid } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Não mostrar nada se já instalado ou dispensado na sessão
  if (isStandalone || dismissed) return null;

  // Android: banner fixo com botão de instalar nativo
  if (canInstallAndroid) {
    return (
      <div className="fixed bottom-[72px] left-0 right-0 z-40 px-4 pb-2 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-[#4E593F] text-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
          <img src={logoMarrom} alt="Tordilha" className="w-10 h-10 rounded-xl bg-white p-1 shrink-0 object-contain" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">Instalar o App</p>
            <p className="text-[11px] text-white/70 leading-tight mt-0.5">Acesso rápido pela tela inicial</p>
          </div>
          <button
            onClick={installAndroid}
            className="flex items-center gap-1.5 bg-white text-[#4E593F] text-xs font-bold px-3 py-2 rounded-xl shrink-0 active:scale-95 transition-all"
          >
            <Download size={14} />
            Instalar
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/60 hover:text-white transition-colors ml-1 shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari: banner + modal com instruções
  if (isIOS && isIOSSafari) {
    return (
      <>
        <div className="fixed bottom-[72px] left-0 right-0 z-40 px-4 pb-2 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#4E593F] text-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
            <img src={logoMarrom} alt="Tordilha" className="w-10 h-10 rounded-xl bg-white p-1 shrink-0 object-contain" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">Instalar o App</p>
              <p className="text-[11px] text-white/70 leading-tight mt-0.5">Acesso rápido pela tela inicial</p>
            </div>
            <button
              onClick={() => setShowIOSModal(true)}
              className="flex items-center gap-1.5 bg-white text-[#4E593F] text-xs font-bold px-3 py-2 rounded-xl shrink-0 active:scale-95 transition-all"
            >
              <Smartphone size={14} />
              Como instalar
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-white/60 hover:text-white transition-colors ml-1 shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <ActionSheet
          isOpen={showIOSModal}
          onClose={() => setShowIOSModal(false)}
          title="Instalar Estância Tordilha"
          subtitle="Adicione à sua tela inicial em 3 passos"
        >
          <div className="space-y-5 py-2">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Share size={20} className="text-slate-600" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-sm text-slate-700 leading-snug">
                  Toque no botão <strong>Compartilhar</strong>{" "}
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 rounded-md text-white text-xs font-bold">↑</span>{" "}
                  na barra inferior do Safari
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-slate-600 text-lg">＋</span>
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-sm text-slate-700 leading-snug">
                  Role para baixo e toque em{" "}
                  <strong>"Adicionar à Tela de Início"</strong>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[#4E593F]/10 flex items-center justify-center shrink-0">
                <span className="text-[#4E593F] text-lg font-bold">✓</span>
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-sm text-slate-700 leading-snug">
                  Toque em <strong>"Adicionar"</strong> no canto superior direito
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-center gap-2">
              <span className="text-amber-500 text-base">💡</span>
              <p className="text-[11px] text-amber-700 font-medium leading-tight">
                Este passo só funciona no Safari. Se estiver em outro navegador, abra o app pelo Safari primeiro.
              </p>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full h-12 rounded-full bg-[#4E593F] text-white font-bold text-sm active:scale-[0.98] transition-all"
            >
              Entendi
            </button>
          </div>
        </ActionSheet>
      </>
    );
  }

  // iOS mas não Safari: aviso para abrir no Safari
  if (isIOS && !isIOSSafari) {
    return (
      <div className="fixed bottom-[72px] left-0 right-0 z-40 px-4 pb-2 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-lg p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Smartphone size={18} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-900 leading-tight">Abra no Safari para instalar</p>
            <p className="text-[11px] text-amber-700 leading-tight mt-0.5">A instalação no iPhone só funciona pelo Safari</p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-400 hover:text-amber-600 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
