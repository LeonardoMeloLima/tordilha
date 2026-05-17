import { useState, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { format, addDays, parseISO, isSameDay, isToday, isSameMonth,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSessoes } from "@/hooks/useSessoes";
import { useSessoesRecorrentes, DIAS_SEMANA } from "@/hooks/useSessoesRecorrentes";
import { useResponsavelAlunos } from "@/hooks/useResponsavelAlunos";
import { usePendentesByAlvo, type SolicitacaoRow } from "@/hooks/useSolicitacoes";
import { useCriarSolicitacao } from "@/hooks/useCriarSolicitacao";
import { useDecidirSolicitacao } from "@/hooks/useDecidirSolicitacao";
import { SwipeableCard } from "../ui/SwipeableCard";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { Button } from "@/components/ui/button";
import { NovoAgendamentoModal } from "./NovoAgendamentoModal";
import { ModalSugerirHorario } from "@/components/shared/ModalSugerirHorario";
import { ModalPropoeRecorrencia } from "@/components/shared/ModalPropoeRecorrencia";
import { PendenteBadge } from "@/components/shared/PendenteBadge";
import { ModalRejeitarSolicitacao } from "@/components/gestor/ModalRejeitarSolicitacao";
import { ModalImpactoMudanca } from "@/components/shared/ModalImpactoMudanca";
import { useToast } from "@/components/ui/use-toast";
import { toast as sonnerToast } from "sonner";

type CalendarView = "semana" | "mes" | "futuro";

export const PaisAgenda = () => {
  const { toast } = useToast();
  const { data: linkedAlunos, isLoading: isLoadingVinculo } = useResponsavelAlunos();
  const alunoIds = useMemo(() => (linkedAlunos || []).map(v => v.aluno_id), [linkedAlunos]);

  const { sessoes, isLoading: isLoadingSessoes, deleteSessao, updateSessao } = useSessoes(undefined, alunoIds);
  const { recorrentes } = useSessoesRecorrentes(alunoIds);

  // Pendentes indexadas por alvo_id (recorrência ou sessão) pra refletir
  // badge "Aguardando: X" + bloquear duplicatas + permitir aprovar/rejeitar
  // inline quando o terapeuta propôs algo.
  const { byAlvo: pendentesByAlvo } = usePendentesByAlvo();
  const criarSol = useCriarSolicitacao();
  const decidir = useDecidirSolicitacao();

  const [view, setView] = useState<CalendarView>("semana");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showAgendar, setShowAgendar] = useState(false);
  const [showRecorrencias, setShowRecorrencias] = useState(false);
  const [sugerirRec, setSugerirRec] = useState<{ open: boolean; recorrencia?: any }>({ open: false });
  const [sugerirSes, setSugerirSes] = useState<{ open: boolean; sessao?: any }>({ open: false });
  const [showPropoeRec, setShowPropoeRec] = useState(false);
  const [rejeitando, setRejeitando] = useState<string | null>(null);
  const [impactando, setImpactando] = useState<SolicitacaoRow | null>(null);

  // Opções pro modal de propor nova recorrência: filhos ativos do pais
  const alunoOptionsPropoe = useMemo(
    () => (linkedAlunos ?? [])
      .filter(v => (v as any).alunos?.status === "ativo")
      .map(v => ({ id: (v as any).alunos.id, nome: (v as any).alunos.nome })),
    [linkedAlunos]
  );

  const aprovarDireto = async (id: string) => {
    try {
      const result = await decidir.mutateAsync({ solicitacao_id: id, decisao: "aprovar" });
      const extra = result.sessoes_atualizadas
        ? ` (${result.sessoes_atualizadas} sessão(ões) movida(s))`
        : "";
      sonnerToast.success(`Solicitação aprovada${extra}`);
    } catch (e: any) {
      if (e?.message === "STALE_REQUEST") {
        sonnerToast.error("Esta solicitação expirou — peça pro terapeuta refazer");
      } else {
        sonnerToast.error(`Erro: ${e?.message ?? "falha ao aprovar"}`);
      }
    }
  };

  const handleAprovarPendente = async (s: SolicitacaoRow) => {
    if (s.tipo === "mudanca_recorrencia") {
      setImpactando(s);
      return;
    }
    await aprovarDireto(s.id);
  };

  const handleRejeitarPendente = async (id: string, motivo: string | undefined) => {
    try {
      await decidir.mutateAsync({ solicitacao_id: id, decisao: "rejeitar", motivo });
      sonnerToast.success("Solicitação rejeitada");
    } catch (e: any) {
      if (e?.message === "STALE_REQUEST") {
        sonnerToast.error("Esta solicitação expirou — peça pro terapeuta refazer");
      } else {
        sonnerToast.error(`Erro: ${e?.message ?? "falha ao rejeitar"}`);
      }
    }
  };

  useEffect(() => {
    const handleFAB = () => setShowAgendar(true);
    window.addEventListener('fab-click-local', handleFAB);
    return () => window.removeEventListener('fab-click-local', handleFAB);
  }, []);

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
      vr => !real.some(r => (r as any).recorrente_id === vr.recorrente_id)
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

  const handleCancelar = async (id: string) => {
    try {
      await deleteSessao.mutateAsync(id);
      toast({ title: "Cancelado", description: "Sessão cancelada com sucesso." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  // Cancelamento via botão explícito (Task 13) — marca status="cancelada"
  // em vez de deletar (mantém histórico). O handleCancelar antigo segue
  // usado pelo SwipeableCard (swipe gesture).
  const handleCancelarSessao = async (id: string) => {
    if (!confirm("Cancelar esta sessão?")) return;
    try {
      await updateSessao.mutateAsync({ id, status: "cancelada" });
      sonnerToast.success("Sessão cancelada");
    } catch (e: any) {
      sonnerToast.error(e?.message ?? "Erro ao cancelar");
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
          const pendenteSes = !isVirtual ? pendentesByAlvo.get(s.id) : undefined;
          const card = (
            <div className={`flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow ${isVirtual ? "border border-[#4E593F]/20" : ""}`}>
              <div className="w-12 h-12 rounded-2xl bg-[#4E593F]/10 flex items-center justify-center">
                <AvatarWithFallback src={s.aluno?.avatar_url} className="w-10 h-10 rounded-xl" type="user" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{s.aluno?.nome || "Praticante"}</p>
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
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                  <Clock size={14} className="text-[#4E593F]" strokeWidth={2.5} />
                  {format(parseISO(s.data_hora), "HH:mm")}
                </div>
                <PendenteBadge solicitacao={pendenteSes} />
              </div>
            </div>
          );
          if (isVirtual) {
            return <div key={s.id}>{card}</div>;
          }
          const pendenteRemarcacao = !!pendenteSes && pendenteSes.tipo === "remarcacao_sessao";
          // Aprovação inline só quando foi o terapeuta que propôs (pais é o alvo)
          const podeDecidir = !!pendenteSes && pendenteSes.solicitante_role === "professor";
          return (
            <div key={s.id} className="space-y-2">
              <SwipeableCard onDelete={() => handleCancelar(s.id)} deleteLabel="Cancelar">
                {card}
              </SwipeableCard>
              <div className="flex items-center justify-end gap-2 px-1 flex-wrap">
                {podeDecidir && pendenteSes && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleAprovarPendente(pendenteSes)}
                      disabled={decidir.isPending}
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejeitando(pendenteSes.id)}
                      disabled={decidir.isPending}
                    >
                      Rejeitar
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pendenteRemarcacao}
                  onClick={() => handleCancelarSessao(s.id)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendenteRemarcacao}
                  onClick={() => setSugerirSes({ open: true, sessao: s })}
                >
                  {pendenteRemarcacao ? "Remarcação pendente" : "Remarcar"}
                </Button>
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
          <Button
            type="button"
            className="w-full"
            onClick={() => setShowPropoeRec(true)}
            disabled={alunoOptionsPropoe.length === 0}
          >
            <Repeat size={14} className="mr-2" />
            Propor nova aula recorrente
          </Button>

          {recorrentes.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
              <Repeat size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Nenhuma recorrência cadastrada</p>
            </div>
          ) : recorrentes.map(r => {
            const pendenteRec = pendentesByAlvo.get(r.id);
            const bloqueado = !!pendenteRec && pendenteRec.tipo === "mudanca_recorrencia";
            const podeDecidir = !!pendenteRec && pendenteRec.solicitante_role === "professor";
            return (
              <div key={r.id} className="space-y-2">
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
                      <p className="text-[11px] text-muted-foreground font-bold">{(r as any).cavalo?.nome || "Sem cavalo"}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-1.5 text-sm font-extrabold text-foreground justify-end">
                      <Clock size={14} className="text-[#4E593F]" strokeWidth={2.5} />
                      {r.horario.slice(0, 5)}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter text-[#4E593F]">
                      {DIAS_SEMANA.find(d => d.value === r.dia_semana)?.label} · semanal
                    </span>
                    <PendenteBadge solicitacao={pendenteRec} />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 px-1 flex-wrap">
                  {podeDecidir && pendenteRec && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAprovarPendente(pendenteRec)}
                        disabled={decidir.isPending}
                      >
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejeitando(pendenteRec.id)}
                        disabled={decidir.isPending}
                      >
                        Rejeitar
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bloqueado}
                    onClick={() => setSugerirRec({ open: true, recorrencia: r })}
                  >
                    {bloqueado ? "Mudança pendente" : "Sugerir novo horário"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <SessionList />
      )}

      <NovoAgendamentoModal isOpen={showAgendar} onClose={() => setShowAgendar(false)} />

      {sugerirRec.open && sugerirRec.recorrencia && (
        <ModalSugerirHorario
          open
          onClose={() => setSugerirRec({ open: false })}
          modo="recorrencia"
          atual={{
            dia_semana: sugerirRec.recorrencia.dia_semana,
            horario: sugerirRec.recorrencia.horario,
          }}
          onSubmit={async (data) => {
            try {
              await criarSol.mutateAsync({
                tipo: "mudanca_recorrencia",
                aluno_id: sugerirRec.recorrencia.aluno_id,
                alvo_id: sugerirRec.recorrencia.id,
                payload: {
                  dia_semana_atual: sugerirRec.recorrencia.dia_semana,
                  horario_atual: sugerirRec.recorrencia.horario,
                  dia_semana_novo: data.dia_semana,
                  horario_novo: data.horario,
                },
              });
              sonnerToast.success("Sua solicitação foi enviada para o gestor.");
            } catch (e: any) {
              if (e?.message === "DUPLICATE_PENDING") {
                sonnerToast.error("Já existe uma solicitação pendente nesse horário.");
              } else {
                sonnerToast.error("Erro ao enviar solicitação.");
              }
            }
          }}
        />
      )}
      {sugerirSes.open && sugerirSes.sessao && (
        <ModalSugerirHorario
          open
          onClose={() => setSugerirSes({ open: false })}
          modo="sessao"
          atual={{ data_hora: sugerirSes.sessao.data_hora }}
          onSubmit={async (data) => {
            try {
              await criarSol.mutateAsync({
                tipo: "remarcacao_sessao",
                aluno_id: sugerirSes.sessao.aluno_id,
                alvo_id: sugerirSes.sessao.id,
                payload: {
                  data_hora_atual: sugerirSes.sessao.data_hora,
                  data_hora_nova: new Date(data.data_hora).toISOString(),
                },
              });
              sonnerToast.success("Sua solicitação foi enviada para o gestor.");
            } catch (e: any) {
              sonnerToast.error(e?.message === "DUPLICATE_PENDING"
                ? "Já existe uma solicitação pendente."
                : "Erro ao enviar solicitação.");
            }
          }}
        />
      )}

      {/* Modal: propor NOVA aula recorrente pra um dos meus filhos */}
      <ModalPropoeRecorrencia
        open={showPropoeRec}
        onClose={() => setShowPropoeRec(false)}
        alunoOptions={alunoOptionsPropoe}
        onSubmit={async (data) => {
          try {
            await criarSol.mutateAsync({
              tipo: "nova_recorrencia",
              aluno_id: data.aluno_id,
              alvo_id: null,
              payload: {
                dia_semana: data.dia_semana,
                horario: data.horario,
              },
            });
            sonnerToast.success("Proposta enviada ao terapeuta.");
          } catch (e: any) {
            sonnerToast.error(e?.message === "DUPLICATE_PENDING"
              ? "Já existe uma proposta pendente pra esse praticante."
              : "Erro ao enviar proposta.");
          }
        }}
      />

      {/* Modal: motivo de rejeição (reusado de gestor/) */}
      <ModalRejeitarSolicitacao
        open={rejeitando !== null}
        onClose={() => setRejeitando(null)}
        onConfirm={async (motivo) => {
          if (rejeitando) await handleRejeitarPendente(rejeitando, motivo);
        }}
      />

      {/* Modal: impacto antes de aprovar mudança de recorrência */}
      {impactando && (
        <ModalImpactoMudanca
          open
          onClose={() => setImpactando(null)}
          onConfirm={async () => { await aprovarDireto(impactando.id); }}
          recorrencia_id={impactando.alvo_id ?? ""}
          aluno_nome={impactando.aluno?.nome ?? "—"}
          atual={{
            dia_semana: (impactando.payload as any).dia_semana_atual,
            horario: (impactando.payload as any).horario_atual,
          }}
          novo={{
            dia_semana: (impactando.payload as any).dia_semana_novo,
            horario: (impactando.payload as any).horario_novo,
          }}
        />
      )}
    </div>
  );
};
