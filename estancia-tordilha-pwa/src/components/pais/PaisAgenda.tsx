import { useSessoes } from "@/hooks/useSessoes";
import { Calendar, Clock, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { NovoAgendamentoModal } from "./NovoAgendamentoModal";
import { SwipeableCard } from "../ui/SwipeableCard";

import { useResponsavelAlunos } from "@/hooks/useResponsavelAlunos";

export const PaisAgenda = () => {
  const { data: linkedAlunos, isLoading: isLoadingVinculo } = useResponsavelAlunos();
  const alunoIds = (linkedAlunos || []).map(v => v.aluno_id);

  const { sessoes, isLoading: isLoadingSessoes, deleteSessao } = useSessoes(undefined, alunoIds);

  const [showAgendar, setShowAgendar] = useState(false);

  useEffect(() => {
    const handleFAB = () => setShowAgendar(true);
    window.addEventListener('fab-click-local', handleFAB);
    return () => window.removeEventListener('fab-click-local', handleFAB);
  }, []);

  const isLoading = isLoadingVinculo || isLoadingSessoes;
  const minhasSessoes = sessoes;

  const handleCancelar = async (id: string) => {
    try {
      await deleteSessao.mutateAsync(id);
    } catch (error) {
      console.error("Erro ao cancelar sessão:", error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">Próximas sessões agendadas</p>
        </div>
        <button
          onClick={() => setShowAgendar(true)}
          className="h-12 px-5 bg-[#EAB308] text-white rounded-2xl flex items-center gap-2 font-bold text-sm shadow-lg shadow-[#EAB308]/20 active:scale-95 transition-all"
        >
          <Calendar size={18} strokeWidth={2.5} />
          Agendar
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="p-6 bg-card rounded-[32px] card-shadow animate-pulse flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : minhasSessoes.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center gap-4">
            <Calendar size={48} className="text-slate-100" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma sessão agendada</p>
          </div>
        ) : (
          minhasSessoes.map((s) => (
            <SwipeableCard
              key={s.id}
              onDelete={() => handleCancelar(s.id)}
              deleteLabel="Cancelar"
            >
              <div className="p-6 bg-card rounded-[32px] card-shadow border-2 border-transparent transition-all group">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[20px] bg-amber-50 border border-amber-100 flex flex-col items-center justify-center shadow-sm transition-transform group-hover:scale-105">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">
                      {format(parseISO(s.data_hora), "MMM", { locale: ptBR })}
                    </span>
                    <span className="text-xl font-black text-slate-900 leading-none">
                      {format(parseISO(s.data_hora), "dd")}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-black text-slate-900 tracking-tight">
                        Sessão com {s.cavalo?.nome || "Cavalo"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wide">
                        <Clock size={14} className="text-[#EAB308]" strokeWidth={2.5} />
                        {format(parseISO(s.data_hora), "HH:mm")}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wide">
                        <User size={14} className="text-slate-400" />
                        {s.aluno?.nome}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SwipeableCard>
          ))
        )}
      </div>


      <NovoAgendamentoModal
        isOpen={showAgendar}
        onClose={() => setShowAgendar(false)}
      />
    </div>
  );
};
