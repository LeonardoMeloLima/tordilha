import { useState } from "react";
import { ActionSheet } from "../ui/ActionSheet";
import { useAvisos } from "@/hooks/useAvisos";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, PartyPopper, Clock, Users, GraduationCap, Globe, Loader2 } from "lucide-react";

interface GestorCreateNotificationProps {
    isOpen: boolean;
    onClose: () => void;
}

type Category = "alerta" | "evento" | "info";
type TargetRole = "geral" | "professor" | "pais";

export function GestorCreateNotification({ isOpen, onClose }: GestorCreateNotificationProps) {
    const { createAviso } = useAvisos();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        titulo: "",
        mensagem: "",
        tipo: "info" as Category,
        target_role: "geral" as TargetRole,
    });

    const categories = [
        { id: "alerta", label: "Crítico", icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50" },
        { id: "evento", label: "Festivo", icon: PartyPopper, color: "text-amber-500", bg: "bg-amber-50" },
        { id: "info", label: "Horário", icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
    ];

    const targets = [
        { id: "professor", label: "Professores", icon: GraduationCap },
        { id: "pais", label: "Responsáveis", icon: Users },
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
                    <div className="grid grid-cols-3 gap-3">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, tipo: cat.id as Category })}
                                className={`flex flex-col items-center gap-3 p-5 rounded-[28px] border-2 transition-all duration-300 active:scale-95 ${formData.tipo === cat.id
                                    ? `border-primary bg-white text-primary shadow-xl shadow-primary/10 ring-4 ring-primary/5`
                                    : `border-slate-100 bg-white/50 backdrop-blur-sm text-slate-400 hover:border-slate-200 hover:bg-white`
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${formData.tipo === cat.id ? 'bg-primary/5' : cat.bg}`}>
                                    <cat.icon size={26} className={formData.tipo === cat.id ? "text-primary" : cat.color} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Público-alvo */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        Enviar para
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {targets.map((target) => (
                            <button
                                key={target.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, target_role: target.id as TargetRole })}
                                className={`flex flex-col items-center gap-3 p-5 rounded-[28px] border-2 transition-all duration-300 active:scale-95 ${formData.target_role === target.id
                                    ? `border-primary bg-white text-primary shadow-xl shadow-primary/10 ring-4 ring-primary/5`
                                    : `border-slate-100 bg-white/50 backdrop-blur-sm text-slate-400 hover:border-slate-200 hover:bg-white`
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors bg-slate-50`}>
                                    <target.icon size={26} className={formData.target_role === target.id ? "text-primary" : "text-slate-400"} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{target.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

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
                            className="w-full bg-white border-2 border-slate-100 rounded-[20px] px-5 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary transition-all shadow-sm focus:shadow-md"
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
                            className="w-full bg-white border-2 border-slate-100 rounded-[20px] px-5 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary transition-all shadow-sm focus:shadow-md resize-none"
                            placeholder="Escreva aqui os detalhes do comunicado..."
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-white rounded-[24px] py-5 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-[0.98] hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Comunicado"}
                </button>
            </form>
        </ActionSheet>
    );
}
