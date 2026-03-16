import { useState, useEffect, useMemo } from "react";
import { Clock, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { ActionSheet } from "../ui/ActionSheet";
import { useToast } from "@/components/ui/use-toast";
import { useSessoes } from "@/hooks/useSessoes";
import { useSessoesRecorrentes, DIAS_SEMANA } from "@/hooks/useSessoesRecorrentes";
import { useAlunos } from "@/hooks/useAlunos";
import { useCavalos } from "@/hooks/useCavalos";
import {
  format, addDays, parseISO, isSameDay, isBefore,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isToday, isSameMonth
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { SwipeableCard } from "../ui/SwipeableCard";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";

type CalendarView = "semana" | "mes" | "futuro";

const HORARIOS_BASE = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

export const GestorAgenda = () => {
  const { toast } = useToast();
  const { sessoes, isLoading: loadingSessoes, createSessao, deleteSessao } = useSessoes();
  const { recorrentes, createRecorrente, deleteRecorrente } = useSessoesRecorrentes();
  const { alunos, isLoading: loadingAlunos } = useAlunos();
  const { cavalos, isLoading: loadingCavalos } = useCavalos();

  const [view, setView] = useState<CalendarView>("semana");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showForm, setShowForm] = useState(false);
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [showRecorrencias, setShowRecorrencias] = useState(false);
  const [newSession, setNewSession] = useState({
    alunoId: "", cavaloId: "", hora: "08:00", diaSemana: 1
  });

  // Week days: today + 6
  const weekDays = useMemo(() => {
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

  // Month grid days
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Offset for first weekday (monday-based grid)
  const firstDayOffset = useMemo(() => {
    const day = getDay(startOfMonth(currentMonth)); // 0=sun
    return day === 0 ? 6 : day - 1; // convert to monday-based
  }, [currentMonth]);

  // day-of-week (0=sun) → monday-based index used by DIAS_SEMANA
  const getDiaSemana = (date: Date) => getDay(date); // 0=dom,1=seg...6=sab

  // Recurring sessions expanded as virtual session objects for a given date
  const expandRecorrentesForDay = (date: Date) => {
    const dow = getDiaSemana(date);
    return recorrentes
      .filter(r => r.dia_semana === dow)
      .map(r => ({
        id: `rec-${r.id}`,
        data_hora: `${format(date, "yyyy-MM-dd")}T${r.horario}`,
        status: "recorrente",
        aluno: (r as any).aluno,
        cavalo: (r as any).cavalo,
        recorrente_id: r.id,
        _isRecorrente: true,
      }));
  };

  // Sessions for the selected day (real + recurring)
  const daySessoes = useMemo(() => {
    const selectedDate = parseISO(selectedDay);
    const real = sessoes.filter((s) => isSameDay(parseISO(s.data_hora), selectedDate));
    const virtual = expandRecorrentesForDay(selectedDate).filter(
      vr => !real.some(r => (r as any).recorrente_id === vr.recorrente_id)
    );
    return [...real, ...virtual].sort((a, b) =>
      a.data_hora.localeCompare(b.data_hora)
    );
  }, [sessoes, recorrentes, selectedDay]);

  // Days that have sessions OR recurring sessions (for dot indicators)
  const daysWithSessoes = useMemo(() => {
    const set = new Set<string>();
    sessoes.forEach(s => set.add(format(parseISO(s.data_hora), "yyyy-MM-dd")));
    // Add all days matching recurrence day-of-week within the visible month range
    if (recorrentes.length > 0) {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      eachDayOfInterval({ start, end }).forEach(day => {
        const dow = getDiaSemana(day);
        if (recorrentes.some(r => r.dia_semana === dow)) {
          set.add(format(day, "yyyy-MM-dd"));
        }
      });
      // Also cover week days
      weekDays.forEach(d => {
        const dow = getDiaSemana(d.fullDate);
        if (recorrentes.some(r => r.dia_semana === dow)) {
          set.add(d.date);
        }
      });
    }
    return set;
  }, [sessoes, recorrentes, currentMonth, weekDays]);

  // Occupied times for selected day (for time slot grid)
  const occupiedTimes = useMemo(() => {
    const dateObj = parseISO(selectedDay);
    return daySessoes.map(s => format(parseISO(s.data_hora), "HH:mm"));
  }, [selectedDay, daySessoes]);

  useEffect(() => {
    const handleOpenForm = () => setShowForm(true);
    window.addEventListener('open-form-sessao', handleOpenForm);
    return () => window.removeEventListener('open-form-sessao', handleOpenForm);
  }, []);

  const handleSave = async () => {
    if (!newSession.alunoId) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione um aluno." });
      return;
    }

    try {
      if (isRecorrente) {
        await createRecorrente.mutateAsync({
          aluno_id: newSession.alunoId,
          cavalo_id: newSession.cavaloId || null,
          dia_semana: newSession.diaSemana,
          horario: newSession.hora + ":00",
          ativo: true,
        });
        toast({ title: "Sucesso", description: "Aula recorrente criada!" });
      } else {
        if (!newSession.cavaloId) {
          toast({ variant: "destructive", title: "Erro", description: "Selecione um cavalo." });
          return;
        }
        const [hours, minutes] = newSession.hora.split(':').map(Number);
        const selectedDateTime = parseISO(selectedDay);
        selectedDateTime.setHours(hours, minutes, 0, 0);

        if (isBefore(selectedDateTime, new Date())) {
          toast({
            variant: "destructive",
            title: "Horário Inválido",
            description: "Não é possível agendar sessões no passado."
          });
          return;
        }

        await createSessao.mutateAsync({
          aluno_id: newSession.alunoId,
          cavalo_id: newSession.cavaloId,
          data_hora: selectedDateTime.toISOString(),
          status: "confirmada"
        });
        toast({ title: "Sucesso", description: "Sessão agendada!" });
      }

      setShowForm(false);
      setNewSession({ alunoId: "", cavaloId: "", hora: "08:00", diaSemana: 1 });
      setIsRecorrente(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao agendar", description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSessao.mutateAsync(id);
      toast({ title: "Sucesso", description: "Agendamento excluído." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
    }
  };

  const handleDeleteRecorrente = async (id: string) => {
    try {
      await deleteRecorrente.mutateAsync(id);
      toast({ title: "Sucesso", description: "Recorrência removida." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDay(dateStr);
  };

  const isPending = createSessao.isPending || createRecorrente.isPending;

  // ─── Shared session list ───────────────────────────────────────────────────
  const SessionList = () => (
    <div className="space-y-3">
      {loadingSessoes ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm font-medium">Carregando sessões...</p>
        </div>
      ) : daySessoes.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
          <CalendarIcon size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Nenhuma sessão neste dia</p>
        </div>
      ) : (
        daySessoes.map((s) => {
            const isVirtual = (s as any)._isRecorrente;
            const card = (
              <div className={`flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow ${isVirtual ? "border border-[#4E593F]/20" : ""}`}>
                <div className="w-12 h-12 rounded-2xl bg-[#4E593F]/10 flex items-center justify-center">
                  <AvatarWithFallback src={s.aluno?.avatar_url} className="w-10 h-10 rounded-xl" type="user" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{s.aluno?.nome || "Aluno não encontrado"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4E593F]" />
                    </div>
                    <p className="text-[11px] text-muted-foreground font-bold">{s.cavalo?.nome || "Sem cavalo"}</p>
                    <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${isVirtual ? "text-[#4E593F] bg-[#4E593F]/10" : s.status === "confirmada" ? "text-[#4E593F] bg-[#4E593F]/10" : "text-slate-400 bg-slate-100"}`}>
                      {isVirtual && <Repeat size={8} />}
                      {isVirtual ? "recorrente" : s.status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                    <Clock size={14} className="text-[#4E593F]" strokeWidth={2.5} />
                    {format(parseISO(s.data_hora), "HH:mm")}
                  </div>
                </div>
              </div>
            );
            return isVirtual ? (
              <div key={s.id}>{card}</div>
            ) : (
              <SwipeableCard key={s.id} onDelete={() => handleDelete(s.id)} deleteLabel="Excluir">
                {card}
              </SwipeableCard>
            );
          })
      )}
    </div>
  );

  // ─── Month/Future calendar grid ────────────────────────────────────────────
  const CalendarGrid = () => (
    <div>
      {/* Month navigation header (only for "futuro" view) */}
      {view === "futuro" && (
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="w-9 h-9 rounded-full bg-card card-shadow flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <p className="text-sm font-extrabold text-foreground capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </p>
          <button
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="w-9 h-9 rounded-full bg-card card-shadow flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>
      )}

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {monthDays.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isSelected = selectedDay === dateStr;
          const hasSessao = daysWithSessoes.has(dateStr);
          const today = isToday(day);
          const inCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              className={`
                relative flex flex-col items-center justify-center h-10 rounded-xl transition-all text-sm font-bold
                ${isSelected ? "bg-[#4E593F] text-white shadow-md shadow-[#4E593F]/30" :
                  today ? "bg-[#4E593F]/10 text-[#4E593F]" :
                  inCurrentMonth ? "text-foreground hover:bg-slate-100" : "text-slate-300"}
              `}
            >
              {format(day, "d")}
              {hasSessao && (
                <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? "bg-white/70" : "bg-[#4E593F]"}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Agenda</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5 capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        {(["semana", "mes", "futuro"] as CalendarView[]).map(v => (
          <button
            key={v}
            onClick={() => {
              setView(v);
              if (v !== "futuro") setCurrentMonth(new Date());
            }}
            className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all capitalize ${view === v ? "bg-white shadow text-[#4E593F]" : "text-slate-500"}`}
          >
            {v === "semana" ? "Semana" : v === "mes" ? "Mês" : "Futuro"}
          </button>
        ))}
      </div>

      {/* Calendar */}
      {view === "semana" ? (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          {weekDays.map((d) => (
            <button
              key={d.date}
              onClick={() => handleDayClick(d.date)}
              className={`relative flex flex-col items-center justify-center min-w-[56px] h-[72px] rounded-2xl transition-all font-bold ${selectedDay === d.date
                ? "bg-[#4E593F] text-white shadow-md shadow-[#4E593F]/30"
                : "bg-card card-shadow text-foreground"
                }`}
            >
              <span className={`text-[10px] font-semibold uppercase ${selectedDay === d.date ? "text-white/80" : "text-muted-foreground"}`}>{d.weekday}</span>
              <span className="text-lg font-extrabold">{d.day}</span>
              {daysWithSessoes.has(d.date) && (
                <div className={`absolute bottom-2 w-1 h-1 rounded-full ${selectedDay === d.date ? "bg-white/70" : "bg-[#4E593F]"}`} />
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-3xl card-shadow p-4">
          <CalendarGrid />
        </div>
      )}

      {/* Day label + filter */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {showRecorrencias
            ? "Recorrências cadastradas"
            : isToday(parseISO(selectedDay))
              ? "Hoje"
              : format(parseISO(selectedDay), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
        <button
          onClick={() => setShowRecorrencias(v => !v)}
          className={`flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-bold transition-all border ${showRecorrencias
            ? "bg-[#4E593F] text-white border-[#4E593F]"
            : "bg-white text-slate-500 border-slate-200"}`}
        >
          <Repeat size={11} />
          Recorrência {recorrentes.length > 0 && `(${recorrentes.length})`}
        </button>
      </div>

      {/* Sessions OR recurrences */}
      {showRecorrencias ? (
        <div className="space-y-3">
          {recorrentes.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
              <Repeat size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Nenhuma recorrência cadastrada</p>
            </div>
          ) : recorrentes.map(r => (
            <SwipeableCard key={r.id} onDelete={() => handleDeleteRecorrente(r.id)} deleteLabel="Remover">
              <div className="flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow">
                <div className="w-12 h-12 rounded-2xl bg-[#4E593F]/10 flex items-center justify-center">
                  <AvatarWithFallback src={(r as any).aluno?.avatar_url} className="w-10 h-10 rounded-xl" type="user" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{(r as any).aluno?.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4E593F]" />
                    </div>
                    <p className="text-[11px] text-muted-foreground font-bold">
                      {(r as any).cavalo?.nome || "Sem cavalo"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                    <Clock size={14} className="text-[#4E593F]" strokeWidth={2.5} />
                    {r.horario.slice(0, 5)}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter text-[#4E593F]">
                    {DIAS_SEMANA.find(d => d.value === r.dia_semana)?.label} · semanal
                  </span>
                </div>
              </div>
            </SwipeableCard>
          ))}
        </div>
      ) : (
        <SessionList />
      )}

      {/* Form ActionSheet */}
      <ActionSheet
        isOpen={showForm}
        onClose={() => { setShowForm(false); setIsRecorrente(false); }}
        title="Agendar Sessão"
        subtitle={isRecorrente ? "Configurar aula recorrente" : `Para o dia ${selectedDay.split('-').reverse().join('/')}`}
        footer={
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="w-full h-14 bg-[#4E593F] hover:bg-[#3E4732] text-white rounded-full font-bold text-lg shadow-lg shadow-[#4E593F]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={20} className="text-white" strokeWidth={2.5} />
            )}
            {isPending ? "Agendando..." : isRecorrente ? "Criar Recorrência" : "Confirmar Agendamento"}
          </button>
        }
      >
        <div className="space-y-5">

          {/* Toggle recorrente */}
          <div
            onClick={() => setIsRecorrente(v => !v)}
            className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${isRecorrente ? "border-[#4E593F] bg-[#4E593F]/5" : "border-slate-200 bg-slate-50"}`}
          >
            <div className="flex items-center gap-2">
              <Repeat size={18} className={isRecorrente ? "text-[#4E593F]" : "text-slate-400"} />
              <div>
                <p className={`text-sm font-bold ${isRecorrente ? "text-[#4E593F]" : "text-slate-700"}`}>Aula Recorrente</p>
                <p className="text-[11px] text-slate-400">Ex: toda terça às 10h</p>
              </div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${isRecorrente ? "bg-[#4E593F]" : "bg-slate-200"} flex items-center px-1`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isRecorrente ? "translate-x-4" : "translate-x-0"}`} />
            </div>
          </div>

          {/* Aluno */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Aluno</label>
            <select
              value={newSession.alunoId}
              onChange={(e) => setNewSession({ ...newSession, alunoId: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white disabled:opacity-50"
              disabled={loadingAlunos}
            >
              <option value="">{loadingAlunos ? "Carregando..." : "Selecionar aluno..."}</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>

          {/* Cavalo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Cavalo {isRecorrente && <span className="text-slate-400 text-xs">(opcional)</span>}</label>
            <select
              value={newSession.cavaloId}
              onChange={(e) => setNewSession({ ...newSession, cavaloId: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white disabled:opacity-50"
              disabled={loadingCavalos}
            >
              <option value="">{loadingCavalos ? "Carregando..." : isRecorrente ? "Selecionar cavalo (opcional)..." : "Selecionar cavalo..."}</option>
              {cavalos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {/* Dia da semana (só em recorrente) */}
          {isRecorrente && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Dia da Semana</label>
              <div className="flex gap-1.5 flex-wrap">
                {DIAS_SEMANA.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setNewSession({ ...newSession, diaSemana: d.value })}
                    className={`h-10 px-3 rounded-xl font-bold text-sm transition-all ${newSession.diaSemana === d.value
                      ? "bg-[#4E593F] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Horário */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Horário</label>
            <div className="grid grid-cols-4 gap-1.5">
              {HORARIOS_BASE.map(hora => {
                const ocupado = !isRecorrente && occupiedTimes.includes(hora);
                const selected = newSession.hora === hora;
                return (
                  <button
                    key={hora}
                    type="button"
                    disabled={ocupado}
                    onClick={() => setNewSession({ ...newSession, hora })}
                    className={`h-11 rounded-xl font-bold text-xs transition-all border-2 ${selected
                      ? "bg-[#4E593F] border-[#4E593F] text-white shadow-md"
                      : ocupado
                        ? "bg-slate-100 border-transparent text-slate-300 cursor-not-allowed opacity-50"
                        : "bg-slate-50 border-transparent text-slate-600 hover:border-slate-200"
                      }`}
                  >
                    {hora}
                    {ocupado && <div className="text-[7px] leading-none">ocupado</div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </ActionSheet>
    </div>
  );
};
