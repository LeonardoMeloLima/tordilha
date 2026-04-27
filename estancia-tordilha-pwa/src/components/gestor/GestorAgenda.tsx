import { useState, useEffect, useMemo } from "react";
import { Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Repeat, Check } from "lucide-react";
import { useSessoes } from "@/hooks/useSessoes";
import { useSessoesRecorrentes, DIAS_SEMANA } from "@/hooks/useSessoesRecorrentes";
import { useAlunos } from "@/hooks/useAlunos";
import { useCavalos } from "@/hooks/useCavalos";
import { ActionSheet } from "../ui/ActionSheet";
import { useToast } from "@/components/ui/use-toast";
import {
  format, addDays, parseISO, isSameDay,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isToday, isSameMonth
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { HORARIOS_BASE, sessionEndTime } from "@/lib/scheduling";

type CalendarView = "semana" | "mes" | "futuro";

export const GestorAgenda = () => {
  const { toast } = useToast();
  const { sessoes, isLoading: loadingSessoes, createSessao } = useSessoes();
  const { recorrentes } = useSessoesRecorrentes();
  const { alunos } = useAlunos();
  const { cavalos } = useCavalos();
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [demoForm, setDemoForm] = useState({
    visitanteNome: "",
    data: format(new Date(), "yyyy-MM-dd"),
    horario: "08:00",
    cavaloId: "",
  });

  useEffect(() => {
    const handler = () => setShowDemoForm(true);
    window.addEventListener('open-form-sessao', handler);
    return () => window.removeEventListener('open-form-sessao', handler);
  }, []);

  const handleSaveDemo = async () => {
    if (!demoForm.visitanteNome.trim()) {
      toast({ variant: "destructive", title: "Informe o nome do visitante." });
      return;
    }
    try {
      const [hh, mm] = demoForm.horario.split(':').map(Number);
      const dt = new Date(demoForm.data);
      dt.setHours(hh, mm, 0, 0);
      await createSessao.mutateAsync({
        data_hora: dt.toISOString(),
        status: "confirmada",
        cavalo_id: demoForm.cavaloId || null,
        tipo: "demonstrativa",
        visitante_nome: demoForm.visitanteNome.trim(),
      } as any);
      toast({ title: "Aula demonstrativa agendada!" });
      setShowDemoForm(false);
      setDemoForm({ visitanteNome: "", data: format(new Date(), "yyyy-MM-dd"), horario: "08:00", cavaloId: "" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const [view, setView] = useState<CalendarView>("semana");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showRecorrencias, setShowRecorrencias] = useState(false);

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

  const handleDayClick = (dateStr: string) => {
    setSelectedDay(dateStr);
  };

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
          return (
            <div key={s.id} className={`flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow ${isVirtual ? "border border-[#4E593F]/20" : ""}`}>
              <div className="w-12 h-12 rounded-2xl bg-[#4E593F]/10 flex items-center justify-center">
                <AvatarWithFallback src={s.aluno?.avatar_url} className="w-10 h-10 rounded-xl" type="user" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  {(s as any).tipo === 'demonstrativa' ? ((s as any).visitante_nome || "Visitante") : (s.aluno?.nome || "Praticante não encontrado")}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4E593F]" />
                  </div>
                  <p className="text-[11px] text-muted-foreground font-bold">{s.cavalo?.nome || "Sem cavalo"}</p>
                  <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${isVirtual ? "text-[#4E593F] bg-[#4E593F]/10" : s.status === "confirmada" ? "text-[#4E593F] bg-[#4E593F]/10" : "text-slate-400 bg-slate-100"}`}>
                    {isVirtual && <Repeat size={8} />}
                    {isVirtual ? "recorrente" : s.status}
                  </span>
                  {(s as any).tipo === 'demonstrativa' && (
                    <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-full text-purple-600 bg-purple-50">
                      demo
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                  <Clock size={14} className="text-[#4E593F]" strokeWidth={2.5} />
                  {format(parseISO(s.data_hora), "HH:mm")}
                </div>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  até {sessionEndTime(format(parseISO(s.data_hora), "HH:mm"))}
                </p>
              </div>
            </div>
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
            <div key={r.id} className="flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow">
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
                <p className="text-[10px] text-muted-foreground font-medium">até {sessionEndTime(r.horario.slice(0, 5))}</p>
                <span className="text-[10px] font-black uppercase tracking-tighter text-[#4E593F]">
                  {DIAS_SEMANA.find(d => d.value === r.dia_semana)?.label} · semanal
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <SessionList />
      )}

      {/* Demo class ActionSheet */}
      <ActionSheet
        isOpen={showDemoForm}
        onClose={() => setShowDemoForm(false)}
        title="Aula Demonstrativa"
        subtitle="Visitante não cadastrado"
        footer={
          <button
            type="button"
            onClick={handleSaveDemo}
            disabled={createSessao.isPending}
            className="w-full h-14 bg-[#4E593F] text-white rounded-full font-bold text-lg shadow-lg shadow-[#4E593F]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {createSessao.isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={20} strokeWidth={2.5} />
            )}
            Agendar Aula Demo
          </button>
        }
      >
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Nome do Visitante</label>
            <input
              value={demoForm.visitanteNome}
              onChange={e => setDemoForm({ ...demoForm, visitanteNome: e.target.value })}
              placeholder="Ex: João Silva"
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Data</label>
            <input
              type="date"
              value={demoForm.data}
              onChange={e => setDemoForm({ ...demoForm, data: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Horário</label>
            <div className="grid grid-cols-4 gap-1.5">
              {HORARIOS_BASE.map(hora => (
                <button
                  key={hora}
                  type="button"
                  onClick={() => setDemoForm({ ...demoForm, horario: hora })}
                  className={`h-11 rounded-xl font-bold text-xs transition-all border-2 ${demoForm.horario === hora
                    ? "bg-[#4E593F] border-[#4E593F] text-white shadow-md"
                    : "bg-slate-50 border-transparent text-slate-600"}`}
                >
                  {hora}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Cavalo <span className="text-slate-400 text-xs">(opcional)</span></label>
            <select
              value={demoForm.cavaloId}
              onChange={e => setDemoForm({ ...demoForm, cavaloId: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] outline-none"
            >
              <option value="">Selecionar cavalo...</option>
              {cavalos.filter(c => c.status === 'Ativo').map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>
      </ActionSheet>
    </div>
  );
};
