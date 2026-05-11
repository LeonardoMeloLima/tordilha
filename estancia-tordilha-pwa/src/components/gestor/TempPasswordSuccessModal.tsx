import { useState } from "react";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { Button } from "@/components/ui/button";
import { Copy, Check, ShieldCheck } from "lucide-react";

interface TempPasswordSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: 'created' | 'reset';
  userName: string;
  email: string;
  tempPassword: string;
}

export function TempPasswordSuccessModal({
  isOpen,
  onClose,
  variant,
  userName,
  email,
  tempPassword,
}: TempPasswordSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard pode falhar em http (não-https). Não bloqueia o fluxo.
    }
  };

  const title = variant === 'created'
    ? `✅ ${userName} criado`
    : `✅ Senha de ${userName} resetada`;

  return (
    <ActionSheet isOpen={isOpen} onClose={onClose} title={title} subtitle={email}>
      <div className="space-y-5 py-2">
        <div className="bg-slate-50 p-4 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Senha temporária
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-2xl font-bold text-[#4E593F] tracking-wider">
              {tempPassword}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copiar senha"
              className="h-11 px-4 rounded-xl bg-[#4E593F] text-white font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-[#3E4732] active:scale-95 transition-all"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl flex gap-3">
          <ShieldCheck size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Compartilhe esta senha com o usuário por WhatsApp ou pessoalmente.
            No primeiro acesso, ele será obrigado a definir uma nova senha.
          </p>
        </div>

        <Button
          onClick={onClose}
          className="w-full h-12 rounded-full bg-[#4E593F] hover:bg-[#3E4732] text-white font-bold shadow-lg shadow-[#4E593F]/20"
        >
          Entendi
        </Button>
      </div>
    </ActionSheet>
  );
}
