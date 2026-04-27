import { useState } from "react";
import { ActionSheet } from "../ui/ActionSheet";
import { useAvisos } from "@/hooks/useAvisos";
import { useResponsaveis } from "@/hooks/useResponsaveis";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, PartyPopper, Clock, Users, GraduationCap, Globe, Loader2, DollarSign, UserCheck } from "lucide-react";

interface GestorCreateNotificationProps {
    isOpen: boolean;
    onClose: () => void;
}

type Category = "alerta" | "evento" | "info" | "financeiro";
type TargetRole = "geral" | "professor" | "pais" | "especifico";

export function GestorCreateNotification({ isOpen, onClose }: GestorCreateNotificationProps) {
    const { createAviso } = useAvisos();
    const { data: responsaveis } = useResponsaveis();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        titulo: "",
        mensagem: "",
        tipo: "info" as Category,
        target_role: "geral" as TargetRole,
        target_user_id: "" as string,
    });

    const categories = [
        { id: "alerta", label: "Crítico", icon: AlertTriangle, color: "text-[#4E593F]", bg: "bg-[#F1F3EF]" },
        { id: "evento", label: "Festivo", icon: PartyPopper, color: "text-[#4E593F]", bg: "bg-[#F1F3EF]" },
        { id: "info", label: "Horário", icon: Clock, color: "text-[#4E593F]", bg: "bg-[#F1F3EF]" },
        { id: "financeiro", label: "Mensalidade", icon: DollarSign, color: "text-[#4E593F]", bg: "bg-[#F1F3EF]" },
    ];

    const targets = [
        { id: "professor", label: "Terapeutas", icon: GraduationCap },
        { id: "pais", label: "Responsáveis", icon: Users },
        { id: "especifico", label: "Específico", icon: UserCheck },
        { id: "geral", label: "Geral", icon: Globe },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.titulo || !formData.mensagem) {
            toast({
                variant: "destructive",
                title: "Campos obrigatórios",
                description: "Por favor, preencha o título e a mensagem.",
            });
            return;
        }

        try {
            setIsLoading(true);
            await createAviso.mutateAsync({
                titulo: formData.titulo,
                mensagem: formData.mensagem,
                tipo: formData.tipo,
                target_role: formData.target_role,
                target_user_id: formData.target_role === 'especifico' ? formData.target_user_id : undefined,
                data: new Date().toISOString(),
            });

            toast({
                title: "Comunicado enviado",
                description: "O comunicado foi criado e disparado com sucesso.",
            });

            setFormData({
                titulo: "",
                mensagem: "",
                tipo: "info",
                target_role: "geral",
                target_user_id: "",
            });
            onClose();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao criar comunicado",
                description: error.message || "Tente novamente mais tarde.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ActionSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Novo Comunicado"
            subtitle="Crie um comunicado para sua equipe ou alunos"
        >
            <form onSubmit={handleSubmit} className="space-y-6 pb-8">
                {/* Categorias */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        Categoria
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, tipo: cat.id as Category })}
                                className={`flex flex-col items-center gap-2 p-3 rounded-[24px] border-2 transition-all duration-300 active:scale-95 ${formData.tipo === cat.id
                                    ? `border-[#4E593F] bg-white text-[#4E593F] shadow-xl shadow-[#4E593F]/10 ring-4 ring-[#4E593F]/5`
                                    : `border-slate-100 bg-white/50 backdrop-blur-sm text-slate-400 hover:border-slate-200 hover:bg-white`
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${formData.tipo === cat.id ? 'bg-[#F1F3EF]' : cat.bg}`}>
                                    <cat.icon size={20} className={formData.tipo === cat.id ? "text-[#4E593F]" : cat.color} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tight text-center">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Público-alvo */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        Enviar para
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {targets.map((target) => (
                            <button
                                key={target.id}
                                type="button"
                                onClick={() => {
                                    const newData = { ...formData, target_role: target.id as TargetRole };
                                    if (target.id === 'especifico') {
                                        newData.tipo = 'financeiro';
                                        newData.titulo = 'Mensalidade em Atraso';
                                        newData.mensagem = 'Olá, notamos que a mensalidade deste mês ainda não foi identificada. Poderia verificar, por favor?';
                                    }
                                    setFormData(newData);
                                }}
                                className={`flex flex-col items-center gap-2 p-3 rounded-[24px] border-2 transition-all duration-300 active:scale-95 ${formData.target_role === target.id
                                    ? `border-[#4E593F] bg-white text-[#4E593F] shadow-xl shadow-[#4E593F]/10 ring-4 ring-[#4E593F]/5`
                                    : `border-slate-100 bg-white/50 backdrop-blur-sm text-slate-400 hover:border-slate-200 hover:bg-white`
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-slate-50`}>
                                    <target.icon size={20} className={formData.target_role === target.id ? "text-[#4E593F]" : "text-slate-400"} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tight text-center">{target.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Seleção de Responsável Específico */}
                {formData.target_role === 'especifico' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            Selecionar Responsável
                        </label>
                        <select
                            value={formData.target_user_id}
                            onChange={(e) => setFormData({ ...formData, target_user_id: e.target.value })}
                            className="w-full bg-white border-2 border-slate-100 rounded-[20px] px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#4E593F] transition-all shadow-sm"
                        >
                            <option value="">Selecione um responsável...</option>
                            {responsaveis?.map((resp) => (
                                <option key={resp.id} value={resp.id}>
                                    {resp.nome} ({resp.email})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Inputs */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            Título
                        </label>
                        <input
                            type="text"
                            value={formData.titulo}
                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                            className="w-full bg-white border-2 border-slate-100 rounded-[20px] px-5 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#4E593F] transition-all shadow-sm focus:shadow-md"
                            placeholder="Ex: Reunião Pedagógica"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            Mensagem
                        </label>
                        <textarea
                            value={formData.mensagem}
                            onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                            rows={4}
                            className="w-full bg-white border-2 border-slate-100 rounded-[20px] px-5 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#4E593F] transition-all shadow-sm focus:shadow-md resize-none"
                            placeholder="Escreva aqui os detalhes do comunicado..."
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#4E593F] text-white rounded-[24px] py-5 text-sm font-black uppercase tracking-widest shadow-xl shadow-[#4E593F]/20 active:scale-[0.98] hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Comunicado"}
                </button>
            </form>
        </ActionSheet>
    );
}
