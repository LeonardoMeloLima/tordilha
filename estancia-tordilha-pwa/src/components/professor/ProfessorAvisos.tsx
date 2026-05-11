import { useState } from "react";
import { useAvisos } from "@/hooks/useAvisos";
import { AlertTriangle, PartyPopper, Clock, Bell } from "lucide-react";
import { ActionSheet } from "../ui/ActionSheet";

const icons: Record<string, React.ReactNode> = {
    alerta: <AlertTriangle size={20} className="text-rose-600" />,
    evento: <PartyPopper size={20} className="text-[#4E593F]" />,
    info: <Clock size={20} className="text-blue-500" />,
};

const bgColors: Record<string, string> = {
    alerta: "bg-rose-50",
    evento: "bg-[#F1F3EF]",
    info: "bg-blue-50",
};

const labels: Record<string, string> = {
    alerta: "Importante",
    evento: "Evento",
    info: "Comunicado",
};

export const ProfessorAvisos = () => {
    const { avisos, isLoading } = useAvisos();
    const [selectedAviso, setSelectedAviso] = useState<any>(null);

    const filteredAvisos = avisos.filter(a =>
        !a.target_role || a.target_role === 'geral' || a.target_role === 'professor'
    );

    return (
        <div className="space-y-6 animate-fade-in pb-24">
            <div>
                <h1 className="text-xl font-extrabold text-foreground tracking-tight">Comunicados</h1>
                <p className="text-sm text-muted-foreground font-medium mt-0.5">{filteredAvisos.length} avisos para terapeutas</p>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="p-5 bg-card rounded-[32px] card-shadow animate-pulse flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-100 rounded w-1/2" />
                                <div className="h-3 bg-slate-100 rounded w-3/4" />
                            </div>
                        </div>
                    ))
                ) : filteredAvisos.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center gap-4">
                        <Bell size={48} className="text-slate-100" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum comunicado pendente</p>
                    </div>
                ) : (
                    filteredAvisos.map((a) => (
                        <div
                            key={a.id}
                            onClick={() => setSelectedAviso(a)}
                            className="p-6 bg-card rounded-[32px] card-shadow border-2 border-transparent hover:border-primary/20 hover:bg-slate-50/50 transition-all group cursor-pointer active:scale-[0.98]"
                        >
                            <div className="flex items-start gap-5">
                                <div className={`w-14 h-14 rounded-2xl ${bgColors[a.tipo] || "bg-slate-50"} flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105`}>
                                    {icons[a.tipo] || <Bell size={20} className="text-slate-400" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-base font-black text-slate-900 tracking-tight">{a.titulo}</p>
                                    <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed line-clamp-2">{a.mensagem}</p>
                                    <div className="flex items-center justify-between mt-4">
                                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                                            {a.criado_em ? new Date(a.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : ""}
                                        </p>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Ver Detalhes</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ActionSheet
                isOpen={!!selectedAviso}
                onClose={() => setSelectedAviso(null)}
                title={selectedAviso?.titulo || "Comunicado"}
            >
                {selectedAviso && (
                    <div className="pb-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-16 h-16 rounded-[24px] ${bgColors[selectedAviso.tipo] || "bg-slate-50"} flex items-center justify-center shadow-lg shadow-slate-200/50`}>
                                {icons[selectedAviso.tipo] || <Bell size={24} className="text-slate-400" />}
                            </div>
                            <div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${selectedAviso.tipo === 'alerta' ? 'bg-rose-100 text-rose-600' : selectedAviso.tipo === 'evento' ? 'bg-[#DDE2D6] text-[#3E4732]' : 'bg-blue-100 text-blue-600'}`}>
                                    {labels[selectedAviso.tipo] || "Comunicado"}
                                </span>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                                    Postado em {new Date(selectedAviso.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50/50 rounded-[32px] p-6 border border-slate-100/50">
                            <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                                {selectedAviso.mensagem}
                            </p>
                        </div>

                        <button
                            onClick={() => setSelectedAviso(null)}
                            className="w-full mt-8 bg-slate-100 text-slate-600 rounded-[20px] py-4 text-sm font-black uppercase tracking-widest active:scale-95 transition-all"
                        >
                            Fechar
                        </button>
                    </div>
                )}
            </ActionSheet>
        </div>
    );
};
