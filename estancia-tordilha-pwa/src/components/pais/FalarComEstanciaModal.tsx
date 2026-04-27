import { useState } from "react";
import { Lightbulb, AlertCircle, Star, Send, Loader2 } from "lucide-react";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { useFeedbacks, type FeedbackCategoria } from "@/hooks/useFeedbacks";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

interface FalarComEstanciaModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const categorias: {
    id: FeedbackCategoria;
    label: string;
    descricao: string;
    icon: React.ReactNode;
    cor: string;
    corBg: string;
    corBorder: string;
}[] = [
    {
        id: "sugestao",
        label: "Sugestão",
        descricao: "Tenho uma ideia para melhorar",
        icon: <Lightbulb size={22} />,
        cor: "text-amber-600",
        corBg: "bg-amber-50",
        corBorder: "border-amber-200",
    },
    {
        id: "reclamacao",
        label: "Reclamação",
        descricao: "Algo não está certo",
        icon: <AlertCircle size={22} />,
        cor: "text-rose-500",
        corBg: "bg-rose-50",
        corBorder: "border-rose-200",
    },
    {
        id: "elogio",
        label: "Elogio",
        descricao: "Quero compartilhar algo positivo",
        icon: <Star size={22} />,
        cor: "text-[#4E593F]",
        corBg: "bg-[#4E593F]/5",
        corBorder: "border-[#4E593F]/20",
    },
];

export function FalarComEstanciaModal({ isOpen, onClose }: FalarComEstanciaModalProps) {
    const { toast } = useToast();
    const { enviarFeedback } = useFeedbacks();
    const [categoria, setCategoria] = useState<FeedbackCategoria | null>(null);
    const [mensagem, setMensagem] = useState("");
    const [isSending, setIsSending] = useState(false);

    const handleClose = () => {
        setCategoria(null);
        setMensagem("");
        onClose();
    };

    const handleEnviar = async () => {
        if (!categoria || !mensagem.trim()) return;
        setIsSending(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado.");

            const nome = user.user_metadata?.full_name || user.email || "Responsável";

            await enviarFeedback.mutateAsync({
                responsavel_id: user.id,
                responsavel_nome: nome,
                categoria,
                mensagem: mensagem.trim(),
            });

            toast({ title: "Mensagem enviada!", description: "A equipe da Estância vai ler em breve." });
            handleClose();
        } catch (e: any) {
            toast({ variant: "destructive", title: "Erro", description: e.message });
        } finally {
            setIsSending(false);
        }
    };

    const categoriaAtual = categorias.find(c => c.id === categoria);
    const podeEnviar = !!categoria && mensagem.trim().length > 0;

    return (
        <ActionSheet
            isOpen={isOpen}
            onClose={handleClose}
            title="Falar com a Estância"
            subtitle="Sua mensagem vai direto para a equipe"
        >
            <div className="space-y-5 pb-4">

                {/* Seleção de categoria */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        O que você quer compartilhar?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {categorias.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setCategoria(c.id)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                                    categoria === c.id
                                        ? `${c.corBg} ${c.corBorder} shadow-sm`
                                        : "bg-slate-50 border-slate-100 hover:border-slate-200"
                                }`}
                            >
                                <span className={categoria === c.id ? c.cor : "text-slate-400"}>
                                    {c.icon}
                                </span>
                                <span className={`text-[11px] font-black ${categoria === c.id ? c.cor : "text-slate-500"}`}>
                                    {c.label}
                                </span>
                            </button>
                        ))}
                    </div>
                    {categoriaAtual && (
                        <p className="text-xs text-slate-400 font-medium ml-1 mt-1">
                            {categoriaAtual.descricao}
                        </p>
                    )}
                </div>

                {/* Campo de mensagem */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Sua mensagem
                    </label>
                    <textarea
                        value={mensagem}
                        onChange={(e) => setMensagem(e.target.value)}
                        placeholder="Escreva aqui o que você gostaria de dizer para a equipe..."
                        rows={5}
                        className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 text-slate-800 text-sm font-medium resize-none focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-300 font-medium text-right mr-1">
                        {mensagem.length} caracteres
                    </p>
                </div>

                {/* Botão enviar */}
                <button
                    type="button"
                    onClick={handleEnviar}
                    disabled={!podeEnviar || isSending}
                    className="w-full h-14 bg-[#4E593F] text-white rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-[#4E593F]/20 disabled:opacity-40 disabled:grayscale transition-all active:scale-[0.98]"
                >
                    {isSending
                        ? <Loader2 size={20} className="animate-spin" />
                        : <Send size={18} />
                    }
                    Enviar Mensagem
                </button>
            </div>
        </ActionSheet>
    );
}
