import { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Repeat,
  Trash2, Loader2, AlertTriangle,
} from "lucide-react";
import {
  format, addDays, parseISO, isSameDay, isToday, isSameMonth,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSessoes } from "@/hooks/useSessoes";
import { useSessoesRecorrentes, DIAS_SEMANA } from "@/hooks/useSessoesRecorrentes";
import { useResponsavelAlunos } from "@/hooks/useResponsavelAlunos";
import { SwipeableCard } from "../ui/SwipeableCard";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { ActionSheet } from "../ui/ActionSheet";
import { usePropostasHorario } from "@/hooks/usePropostasHorario";
import { useToast } from "@/components/ui/use-toast";
import { HORARIOS_BASE, sessionEndTime } from "@/lib/scheduling";

type CalendarView = "semana" | "mes" | "futuro";


export const PaisAgenda = () => {
  const { toast } = useToast();
  const { data: linkedAlunos, isLoading: isLoadingVinculo } = useResponsavelAlunos();
  const alunoIds = useMemo(() => (linkedAlunos || []).map(v => v.aluno_id), [linkedAlunos]);
  const inactiveAlunos = useMemo(() =>
    (linkedAlunos || []).filter(v => (v.alunos as any)?.ativo === false),
    [linkedAlunos]
  );

  const { sessoes, isLoading: isLoadingSessoes, deleteSessao, updateSessao, createSessao } = useSessoes(undefined, alunoIds);
  const { recorrentes, deleteRecorrente, updateRecorrente, createRecorrente } = useSessoesRecorrentes(alunoIds);

  const { propostas, atualizarStatus } = usePropostasHorario(alunoIds.length > 0 ? { alunoIds } : undefined);
  const [aceitandoProposta, setAceitandoProposta] = useState<any>(null);
  const [isAceitando, setIsAceitando] = useState(false);

  const [view, setView] = useState<CalendarView>("semana");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showRecorrencias, setShowRecorrencias] = useState(false);

  // ── Action Sheet state ────────────────────────────────────────────────────
  const [actionSessao, setActionSessao] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Week days: today + 6
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(new Date(), i);
      return {
        date: format(date, "yyyy-MM-dd"),
        day: format(date, "d"),
        weekday: format(date, "EEE", { locale: ptBR }).replace('.', ''),
        fullDate: date,
      };
    });
  }, []);

  // Month grid days
  const monthDays = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  }, [currentMonth]);

  const firstDayOffset = useMemo(() => {
    const day = getDay(startOfMonth(currentMonth));
    return day === 0 ? 6 : day - 1;
  }, [currentMonth]);

  const getDow = (date: Date) => getDay(date);

  const proximaDataDow = (dow: number): Date => {
    const today = new Date();
    const todayDow = getDay(today);
    const days = (dow - todayDow + 7) % 7 || 7;
    return addDays(today, days);
  };

  const handleAceitarRecorrente = async (p: any) => {
    setIsAceitando(true);
    try {
      await createRecorrente.mutateAsync({
        aluno_id: p.aluno_id,
        cavalo_id: p.cavalo_id || null,
        professor_id: p.terapeuta_id,
        dia_semana: p.dia_semana,
        horario: p.horario,
        ativo: true,
      });
      await atualizarStatus.mutateAsync({ id: p.id, status: "aceita" });
      toast({ title: "Recorrência confirmada!", description: "Sessão semanal agendada com sucesso." });
      setAceitandoProposta(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setIsAceitando(false);
    }
  };

  const handleAceitarUmaVez = async (p: any) => {
    setIsAceitando(true);
    try {
      const [hh, mm] = p.horario.slice(0, 5).split(":").map(Number);
      const nextDate = proximaDataDow(p.dia_semana);
      const dataHora = new Date(nextDate);
      dataHora.setHours(hh, mm, 0, 0);
      await createSessao.mutateAsync({
        aluno_id: p.aluno_id,
        cavalo_id: p.cavalo_id || null,
        professor_id: p.terapeuta_id,
        data_hora: dataHora.toISOString(),
        status: "confirmada",
      });
      await atualizarStatus.mutateAsync({ id: p.id, status: "aceita" });
      toast({ title: "Sessão confirmada!", description: `Agendada para ${format(dataHora, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}.` });
      setAceitandoProposta(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setIsAceitando(false);
    }
  };

  // Expand recurring sessions as virtual entries for a given date
  const expandRecorrentesForDay = (date: Date) => {
    const dow = getDow(date);
    return recorrentes
      .filter(r => r.dia_semana === dow)
      .map(r => ({
        id: `rec-${r.id}`,
        data_hora: `${format(date, "yyyy-MM-dd")}T${r.horario}`,
        status: "recorrente",
        aluno: (r as any).aluno,
        aluno_id: r.aluno_id,
        professor_id: r.professor_id,
        cavalo_id: r.cavalo_id,
        cavalo: (r as any).cavalo,
        recorrente_id: r.id,
        _isRecorrente: true,
      }));
  };

  // Sessions for selected day (real + recurring)
  const daySessoes = useMemo(() => {
    const date = parseISO(selectedDay);
    const real = sessoes.filter(s => isSameDay(parseISO(s.data_hora), date));
    const virtual = expandRecorrentesForDay(date).filter(
      vr => !real.some(r =>
        (r as any).recorrente_id === vr.recorrente_id ||
        ((r as any).aluno_id === vr.aluno_id &&
          format(parseISO(r.data_hora), "HH:mm") === format(parseISO(vr.data_hora), "HH:mm"))
      )
    );
    return [...real, ...virtual].sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  }, [sessoes, recorrentes, selectedDay]);

  // Days with sessions or recurring (dot indicators)
  const daysWithSessoes = useMemo(() => {
    const set = new Set<string>();
    sessoes.forEach(s => set.add(format(parseISO(s.data_hora), "yyyy-MM-dd")));
    if (recorrentes.length > 0) {
      eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }).forEach(day => {
        if (recorrentes.some(r => r.dia_semana === getDow(day))) set.add(format(day, "yyyy-MM-dd"));
      });
      weekDays.forEach(d => {
        if (recorrentes.some(r => r.dia_semana === getDow(d.fullDate))) set.add(d.date);
      });
    }
    return set;
  }, [sessoes, recorrentes, currentMonth, weekDays]);

  // ── Action handlers ────────────────────────────────────────────────────────
  const handleCancelar = async (id: string) => {
    try {
      await deleteSessao.mutateAsync(id);
      toast({ title: "Cancelado", description: "Sessão cancelada com sucesso." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const openActionSheet = (s: any) => {
    setActionSessao(s);
    setIsSaving(false);
  };

  // Informa falta nesta semana (sessão recorrente): cria um registro de falta
  // para a data específica sem cancelar a recorrência inteira
  const handleInformarFalta = async () => {
    if (!actionSessao) return;
    setIsSaving(true);
    try {
      await createSessao.mutateAsync({
        aluno_id: actionSessao.aluno_id,
        professor_id: actionSessao.professor_id ?? null,
        cavalo_id: actionSessao.cavalo_id ?? null,
        data_hora: actionSessao.data_hora,
        status: "falta",
      });
      toast({ title: "Falta registrada.", description: "O terapeuta será notificado." });
      setActionSessao(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelarSessao = async () => {
    if (!actionSessao) return;
    setIsSaving(true);
    try {
      await updateSessao.mutateAsync({ id: actionSessao.id, status: "cancelada" });
      toast({ title: "Sessão cancelada." });
      setActionSessao(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isLoadingVinculo || isLoadingSessoes;

  // ─── Session list ──────────────────────────────────────────────────────────
  const SessionList = () => (
    <div className="space-y-3">
      {isLoading ? (
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
            <button
              type="button"
              onClick={() => openActionSheet(s)}
              className={`w-full flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow text-left ${isVirtual ? "border border-[#4E593F]/20" : ""}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-[#4E593F]/10 flex items-center justify-center shrink-0">
                <AvatarWithFallback src={s.aluno?.avatar_url} className="w-10 h-10 rounded-xl" type="user" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{s.aluno?.nome || "Praticante"}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4E593F]" />
                  </div>
                  <p className="text-[11px] text-muted-foreground font-bold truncate">{s.cavalo?.nome || "Sem cavalo"}</p>
                  <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${isVirtual ? "text-[#4E593F] bg-[#4E593F]/10" : s.status === "confirmada" ? "text-[#4E593F] bg-[#4E593F]/10" : "text-slate-400 bg-slate-100"}`}>
                    {isVirtual && <Repeat size={8} />}
                    {isVirtual ? "recorrente" : s.status}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                  <Clock size={14} className="text-[#4E593F]" strokeWidth={2.5} />
                  {format(parseISO(s.data_hora), "HH:mm")}
                </div>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  até {sessionEndTime(format(parseISO(s.data_hora), "HH:mm"))}
                </p>
              </div>
            </button>
          );
          return isVirtual ? (
            <div key={s.id}>{card}</div>
          ) : (
            <SwipeableCard key={s.id} onDelete={() => handleCancelar(s.id)} deleteLabel="Cancelar">
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
      <div className="grid grid-cols-7 mb-1">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`e-${i}`} />)}
        {monthDays.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isSelected = selectedDay === dateStr;
          const hasSessao = daysWithSessoes.has(dateStr);
          const today = isToday(day);
          const inMonth = isSameMonth(day, currentMonth);
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDay(dateStr)}
              className={`relative flex flex-col items-center justify-center h-10 rounded-xl transition-all text-sm font-bold
                ${isSelected ? "bg-[#4E593F] text-white shadow-md shadow-[#4E593F]/30"
                  : today ? "bg-[#4E593F]/10 text-[#4E593F]"
                  : inMonth ? "text-foreground hover:bg-slate-100" : "text-slate-300"}`}
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

  const isVirtualAction = actionSessao?._isRecorrente;

  return (
    <div className="space-y-5 animate-fade-in pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Agenda</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5 capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Inactive student warning */}
      {inactiveAlunos.length > 0 && (
        <div className="flex gap-3 items-start p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-800">
              {inactiveAlunos.length === 1 ? "Praticante temporariamente inativo" : "Praticantes temporariamente inativos"}
            </p>
            <p className="text-xs text-amber-600 font-medium mt-0.5 leading-relaxed">
              <span className="font-bold">{inactiveAlunos.map(v => (v.alunos as any)?.nome).join(", ")}</span> não pode{inactiveAlunos.length > 1 ? "m" : ""} ser agendado{inactiveAlunos.length > 1 ? "s" : ""} no momento. Entre em contato com a Estância Tordilha.
            </p>
          </div>
        </div>
      )}

      {/* Proposals banner */}
      {propostas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black text-[#4E593F] uppercase tracking-wider flex items-center gap-1.5">
            <CalendarIcon size={12} />
            Horários propostos pelo terapeuta ({propostas.length})
          </p>
          {propostas.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setAceitandoProposta(p)}
              className="w-full flex items-center gap-4 p-4 bg-[#4E593F]/5 border-2 border-[#4E593F]/20 rounded-2xl text-left hover:border-[#4E593F]/40 transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#4E593F] flex items-center justify-center shrink-0">
                <CalendarIcon size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#4E593F]">{p.aluno?.nome}</p>
                <p className="text-xs text-slate-500 font-medium">
                  {DIAS_SEMANA.find(d => d.value === p.dia_semana)?.label}s às {p.horario?.slice(0, 5)} – {sessionEndTime(p.horario?.slice(0, 5) ?? "08:00")}
                  {p.cavalo ? ` · ${p.cavalo.nome}` : ""}
                </p>
              </div>
              <span className="text-[10px] font-black text-[#4E593F] bg-[#4E593F]/10 px-2 py-1 rounded-full shrink-0">
                Confirmar
              </span>
            </button>
          ))}
        </div>
      )}

      {/* View toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        {(["semana", "mes", "futuro"] as CalendarView[]).map(v => (
          <button
            key={v}
            onClick={() => { setView(v); if (v !== "futuro") setCurrentMonth(new Date()); }}
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
              onClick={() => setSelectedDay(d.date)}
              className={`relative flex flex-col items-center justify-center min-w-[56px] h-[72px] rounded-2xl transition-all font-bold ${selectedDay === d.date
                ? "bg-[#4E593F] text-white shadow-md shadow-[#4E593F]/30"
                : "bg-card card-shadow text-foreground"}`}
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

      {/* Day label + Recorrência filter */}
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
            <SwipeableCard key={r.id} onDelete={async () => {
              try {
                await deleteRecorrente.mutateAsync(r.id);
                toast({ title: "Recorrência cancelada." });
              } catch (e: any) {
                toast({ variant: "destructive", title: "Erro", description: e.message });
              }
            }} deleteLabel="Cancelar">
              <button
                type="button"
                onClick={() => openActionSheet({
                  id: `rec-${r.id}`,
                  data_hora: `${format(new Date(), "yyyy-MM-dd")}T${r.horario}`,
                  status: "recorrente",
                  aluno: (r as any).aluno,
                  cavalo: (r as any).cavalo,
                  recorrente_id: r.id,
                  _isRecorrente: true,
                  _recorrenteRaw: r,
                })}
                className="w-full flex items-center gap-4 p-5 bg-card rounded-3xl text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#4E593F]/10 flex items-center justify-center shrink-0">
                  <AvatarWithFallback src={(r as any).aluno?.avatar_url} className="w-10 h-10 rounded-xl" type="user" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{(r as any).aluno?.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4E593F]" />
                    </div>
                    <p className="text-[11px] text-muted-foreground font-bold truncate">{(r as any).cavalo?.nome || "Sem cavalo"}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                    <Clock size={14} className="text-[#4E593F]" strokeWidth={2.5} />
                    {r.horario.slice(0, 5)}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">até {sessionEndTime(r.horario.slice(0, 5))}</p>
                  <span className="text-[10px] font-black uppercase tracking-tighter text-[#4E593F]">
                    {DIAS_SEMANA.find(d => d.value === r.dia_semana)?.label} · semanal
                  </span>
                </div>
              </button>
            </SwipeableCard>
          ))}
        </div>
      ) : (
        <SessionList />
      )}

      {/* ── Session action sheet ──────────────────────────────────────────────── */}
      <ActionSheet
        isOpen={!!actionSessao}
        onClose={() => setActionSessao(null)}
        title={actionSessao?.aluno?.nome || "Sessão"}
        subtitle={
          actionSessao
            ? isVirtualAction
              ? `Toda ${DIAS_SEMANA.find(d => d.value === recorrentes.find(r => r.id === actionSessao.recorrente_id)?.dia_semana)?.label ?? ""} às ${format(parseISO(actionSessao.data_hora), "HH:mm")}`
              : format(parseISO(actionSessao.data_hora), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })
            : undefined
        }
      >
        {actionSessao && (
          <div className="space-y-3 pb-2">
            {/* Session info card */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-11 h-11 rounded-xl bg-[#4E593F]/10 flex items-center justify-center shrink-0">
                <AvatarWithFallback src={actionSessao.aluno?.avatar_url} className="w-9 h-9 rounded-lg" type="user" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{actionSessao.aluno?.nome || "Praticante"}</p>
                <p className="text-xs text-slate-500 font-medium">{actionSessao.cavalo?.nome || "Sem cavalo"}</p>
              </div>
              <div className="flex items-center gap-1.5 text-base font-black text-[#4E593F] shrink-0">
                <Clock size={15} strokeWidth={2.5} />
                {format(parseISO(actionSessao.data_hora), "HH:mm")}
              </div>
            </div>

            {isVirtualAction ? (
              /* Sessão recorrente: apenas informar falta desta semana */
              <button
                type="button"
                onClick={handleInformarFalta}
                disabled={isSaving}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-amber-100 hover:bg-amber-50 transition-all active:scale-[0.98] disabled:opacity-40"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  {isSaving
                    ? <Loader2 size={18} className="text-amber-400 animate-spin" />
                    : <Trash2 size={18} className="text-amber-400" strokeWidth={2.5} />
                  }
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-black text-amber-600">Não vou nesta semana</p>
                  <p className="text-xs text-amber-400 font-medium">Informa falta só desta aula, sem cancelar a recorrência</p>
                </div>
              </button>
            ) : (
              /* Sessão avulsa: cancelar */
              <button
                type="button"
                onClick={handleCancelarSessao}
                disabled={isSaving}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-rose-100 hover:bg-rose-50 transition-all active:scale-[0.98] disabled:opacity-40"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                  {isSaving
                    ? <Loader2 size={18} className="text-rose-400 animate-spin" />
                    : <Trash2 size={18} className="text-rose-400" strokeWidth={2.5} />
                  }
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-black text-rose-500">Cancelar sessão</p>
                  <p className="text-xs text-rose-300 font-medium">Remove esta sessão da agenda</p>
                </div>
              </button>
            )}
          </div>
        )}
      </ActionSheet>

      {/* Accept proposal ActionSheet */}
      <ActionSheet
        isOpen={!!aceitandoProposta}
        onClose={() => setAceitandoProposta(null)}
        title="Confirmar Horário"
        subtitle={aceitandoProposta ? `${DIAS_SEMANA.find(d => d.value === aceitandoProposta.dia_semana)?.label}s às ${aceitandoProposta.horario?.slice(0, 5)} – ${sessionEndTime(aceitandoProposta.horario?.slice(0, 5) ?? "08:00")}` : ""}
      >
        {aceitandoProposta && (
          <div className="space-y-4 pb-2">
            {/* Info card */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
              <AvatarWithFallback src={aceitandoProposta.aluno?.avatar_url} className="w-11 h-11 rounded-xl" type="user" />
              <div>
                <p className="text-sm font-bold text-slate-800">{aceitandoProposta.aluno?.nome}</p>
                <p className="text-xs text-slate-500">
                  {aceitandoProposta.cavalo?.nome || "Sem cavalo"} · {aceitandoProposta.terapeuta?.full_name}
                </p>
              </div>
            </div>

            {/* Recorrente (primary) */}
            <button
              type="button"
              onClick={() => handleAceitarRecorrente(aceitandoProposta)}
              disabled={isAceitando}
              className="w-full flex items-center gap-4 p-4 bg-[#4E593F] rounded-2xl text-left active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Repeat size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-white">Confirmar como Recorrente</p>
                <p className="text-xs text-white/70">Todo{aceitandoProposta.dia_semana === 0 || aceitandoProposta.dia_semana === 6 ? "" : "a"} {DIAS_SEMANA.find(d => d.value === aceitandoProposta.dia_semana)?.label} às {aceitandoProposta.horario?.slice(0, 5)}</p>
              </div>
              {isAceitando && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            </button>

            {/* Uma vez (secondary) */}
            <button
              type="button"
              onClick={() => handleAceitarUmaVez(aceitandoProposta)}
              disabled={isAceitando}
              className="w-full flex items-center gap-4 p-4 bg-white border-2 border-slate-200 rounded-2xl text-left active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <CalendarIcon size={18} className="text-slate-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-700">Confirmar uma vez</p>
                <p className="text-xs text-slate-400">Próximo {DIAS_SEMANA.find(d => d.value === aceitandoProposta.dia_semana)?.label}</p>
              </div>
            </button>

            {/* Recusar */}
            <button
              type="button"
              onClick={async () => {
                try {
                  await atualizarStatus.mutateAsync({ id: aceitandoProposta.id, status: "cancelada" });
                  toast({ title: "Proposta recusada." });
                  setAceitandoProposta(null);
                } catch (e: any) {
                  toast({ variant: "destructive", title: "Erro", description: e.message });
                }
              }}
              className="w-full text-center text-sm font-bold text-slate-400 py-2 active:text-rose-400 transition-colors"
            >
              Recusar proposta
            </button>
          </div>
        )}
      </ActionSheet>
    </div>
  );
};
