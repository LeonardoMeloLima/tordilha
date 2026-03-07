import { useSessoes } from "@/hooks/useSessoes";
import { Calendar, Clock, AlertTriangle, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const PaisAgenda = () => {
  const { sessoes, isLoading } = useSessoes();

  // In a real scenario, we'd filter by the student(s) linked to this parent's profile
  // For now, we show all since the link is not yet implemented in the profiles table
  const minhasSessoes = sessoes;

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Agenda</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">Próximas sessões agendadas</p>
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
            <div key={s.id} className="p-6 bg-card rounded-[32px] card-shadow border-2 border-transparent hover:border-slate-50 transition-all group">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-[20px] bg-amber-50 flex flex-col items-center justify-center border border-amber-100 shadow-sm transition-transform group-hover:scale-105">
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
          ))
        )}
      </div>

      {!isLoading && minhasSessoes.length > 0 && (
        <button
          type="button"
          className="w-full py-5 bg-rose-50 text-rose-600 rounded-[24px] font-black text-xs uppercase tracking-widest touch-target flex items-center justify-center gap-3 border-2 border-rose-100 active:scale-[0.98] transition-all"
        >
          <AlertTriangle size={18} />
          Avisar Falta / Cancelar
        </button>
      )}
    </div>
  );
};
