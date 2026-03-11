import { useState, useMemo } from "react";
import { WifiOff, Clock, Play, Calendar as CalendarIcon } from "lucide-react";
import { useSessoes } from "@/hooks/useSessoes";
import { format, addDays, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";

export const ProfessorAgenda = () => {
  const { sessoes, isLoading } = useSessoes();

  // Generate dynamic days (today + 6 days)
  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(new Date(), i);
      return {
        date: format(date, "yyyy-MM-dd"),
        day: format(date, "d"),
        weekday: format(date, "EEE", { locale: ptBR }).replace('.', ''),
        fullDate: date
      };
    });
  }, []);

  const [selectedDay, setSelectedDay] = useState(days[0].date);

  const daySessoes = useMemo(() => {
    return sessoes
      .filter((s) => {
        const isSelectedDay = isSameDay(parseISO(s.data_hora), parseISO(selectedDay));
        const isNotConcluida = s.status !== "concluida";
        return isSelectedDay && isNotConcluida;
      })
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  }, [sessoes, selectedDay]);

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Minha Agenda</h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">
            {format(parseISO(selectedDay), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-accent/15 text-accent-foreground text-[10px] font-extrabold">
          <WifiOff size={12} />
          Online
        </div>
      </div>

      {/* Horizontal calendar */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {days.map((d) => (
          <button
            key={d.date}
            onClick={() => setSelectedDay(d.date)}
            className={`flex flex-col items-center justify-center min-w-[56px] h-[72px] rounded-2xl transition-all font-bold ${selectedDay === d.date
              ? "bg-[#EAB308] text-white shadow-md shadow-[#EAB308]/30"
              : "bg-card card-shadow text-foreground"
              }`}
          >
            <span className={`text-[10px] font-semibold uppercase ${selectedDay === d.date ? "text-white/80" : "text-muted-foreground"}`}>{d.weekday}</span>
            <span className="text-lg font-extrabold">{d.day}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-3xl card-shadow p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : daySessoes.length === 0 ? (
          <div className="text-center py-16 bg-white border-2 border-dashed border-slate-100 rounded-[32px] space-y-3">
            <CalendarIcon size={40} className="mx-auto text-slate-200" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma sessão hoje</p>
          </div>
        ) : (
          daySessoes.map((s) => (
            <div key={s.id} className="bg-card rounded-3xl card-shadow p-5 transition-all active:scale-[0.98]">
              <div className="flex items-center gap-4">
                <AvatarWithFallback
                  src={s.aluno?.avatar_url}
                  className="w-14 h-14 rounded-2xl"
                  type="user"
                />
                <div className="flex-1">
                  <p className="text-base font-bold text-slate-900">{s.aluno?.nome}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    c/ {s.cavalo?.nome} · {s.aluno?.diagnostico || "Avaliação"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-black text-slate-900 bg-slate-50 px-3 py-1.5 rounded-full">
                  <Clock size={14} className="text-[#EAB308]" strokeWidth={2.5} />
                  {format(parseISO(s.data_hora), "HH:mm")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('iniciar-sessao', { detail: { sessaoId: s.id } }));
                }}
                className="w-full mt-4 py-4 bg-[#EAB308] text-white rounded-[20px] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#EAB308]/20 active:scale-[0.97] transition-all"
              >
                <Play size={16} fill="white" />
                Iniciar Sessão
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

