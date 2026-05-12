import { useState, useMemo, useEffect } from "react";
import { /* WifiOff, */ Clock, Play, Calendar as CalendarIcon } from "lucide-react";
import { useSessoes } from "@/hooks/useSessoes";
import { useAlunos } from "@/hooks/useAlunos";
import { useCavalos } from "@/hooks/useCavalos";
import { useRoleSession } from "@/hooks/supabase/useRoleSession";
import { useToast } from "@/components/ui/use-toast";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { format, addDays, parseISO, isSameDay, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";

const HORARIOS_BASE = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

export const ProfessorAgenda = () => {
  const { sessoes, isLoading, createSessao } = useSessoes();
  const { alunos, isLoading: loadingAlunos } = useAlunos();
  const { cavalos, isLoading: loadingCavalos } = useCavalos();
  const { session } = useRoleSession();
  const { toast } = useToast();
  const userId = session?.user?.id;

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
  const [showForm, setShowForm] = useState(false);
  const [newSession, setNewSession] = useState({ alunoId: "", cavaloId: "", hora: "08:00" });

  // Só os praticantes atribuídos a este terapeuta podem ser agendados por ele.
  const meusAlunos = useMemo(() => {
    if (!userId) return [];
    return alunos.filter(a => a.professor_id === userId);
  }, [alunos, userId]);

  const daySessoes = useMemo(() => {
    return sessoes
      .filter((s) => {
        const isSelectedDay = isSameDay(parseISO(s.data_hora), parseISO(selectedDay));
        const isNotConcluida = s.status !== "concluida";
        return isSelectedDay && isNotConcluida;
      })
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  }, [sessoes, selectedDay]);

  // Horários já ocupados no dia selecionado (pra desabilitar slots na grade do form)
  const occupiedTimes = useMemo(() => {
    return daySessoes.map(s => format(parseISO(s.data_hora), "HH:mm"));
  }, [daySessoes]);

  // FAB do BottomNav (Index.tsx dispatcha 'fab-click-local' pra non-gestor) → abre form.
  useEffect(() => {
    const handleFAB = () => setShowForm(true);
    window.addEventListener('fab-click-local', handleFAB);
    return () => window.removeEventListener('fab-click-local', handleFAB);
  }, []);

  const handleSave = async () => {
    if (!newSession.alunoId) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione um praticante." });
      return;
    }
    if (!newSession.cavaloId) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione um cavalo." });
      return;
    }
    if (!userId) {
      toast({ variant: "destructive", title: "Erro", description: "Sessão expirada. Faça login novamente." });
      return;
    }

    try {
      const [hours, minutes] = newSession.hora.split(':').map(Number);
      const selectedDateTime = parseISO(selectedDay);
      selectedDateTime.setHours(hours, minutes, 0, 0);

      if (isBefore(selectedDateTime, new Date())) {
        toast({ variant: "destructive", title: "Horário Inválido", description: "Não é possível agendar sessões no passado." });
        return;
      }

      await createSessao.mutateAsync({
        aluno_id: newSession.alunoId,
        cavalo_id: newSession.cavaloId,
        data_hora: selectedDateTime.toISOString(),
        status: "confirmada",
        professor_id: userId,
      });
      toast({ title: "Sucesso", description: "Sessão agendada!" });
      setShowForm(false);
      setNewSession({ alunoId: "", cavaloId: "", hora: "08:00" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao agendar", description: error.message });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Minha Agenda</h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">
            {format(parseISO(selectedDay), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        {/* Desativado em 2026-05-12 — pill "Online" tinha ícone WifiOff (contradição) e
            não refletia status real de rede. Pra religar com lógica correta: trocar pra
            <Wifi /> ou usar navigator.onLine + listener 'online'/'offline'.
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-accent/15 text-accent-foreground text-[10px] font-extrabold">
          <WifiOff size={12} />
          Online
        </div>
        */}
      </div>

      {/* Horizontal calendar */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {days.map((d) => (
          <button
            key={d.date}
            onClick={() => setSelectedDay(d.date)}
            className={`flex flex-col items-center justify-center min-w-[56px] h-[72px] rounded-2xl transition-all font-bold ${selectedDay === d.date
              ? "bg-[#4E593F] text-white shadow-md shadow-[#4E593F]/30"
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
                  <Clock size={14} className="text-[#4E593F]" strokeWidth={2.5} />
                  {format(parseISO(s.data_hora), "HH:mm")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('iniciar-sessao', { detail: { sessaoId: s.id } }));
                }}
                className="w-full mt-4 py-4 bg-[#4E593F] text-white rounded-[20px] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#4E593F]/20 active:scale-[0.97] transition-all"
              >
                <Play size={16} fill="white" />
                Iniciar Sessão
              </button>
            </div>
          ))
        )}
      </div>

      {/* ============ Form modal de criar sessão (apenas terapeuta, sem recorrente) ============ */}
      <ActionSheet
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nova Sessão"
        subtitle={`Para ${format(parseISO(selectedDay), "EEEE, d 'de' MMMM", { locale: ptBR })}`}
      >
        <div className="space-y-5 py-2">
          {/* Praticante (filtrado pelos meus) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Praticante</label>
            <select
              value={newSession.alunoId}
              onChange={(e) => setNewSession({ ...newSession, alunoId: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white disabled:opacity-50"
              disabled={loadingAlunos || meusAlunos.length === 0}
            >
              <option value="">
                {loadingAlunos
                  ? "Carregando..."
                  : meusAlunos.length === 0
                    ? "Nenhum praticante atribuído a você"
                    : "Selecionar praticante..."}
              </option>
              {meusAlunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            {meusAlunos.length === 0 && !loadingAlunos && (
              <p className="text-[11px] text-slate-500 ml-1">
                O gestor precisa atribuir praticantes a você antes que você possa agendar.
              </p>
            )}
          </div>

          {/* Cavalo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Cavalo</label>
            <select
              value={newSession.cavaloId}
              onChange={(e) => setNewSession({ ...newSession, cavaloId: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] focus:border-[#4E593F] outline-none transition-all shadow-sm focus:bg-white disabled:opacity-50"
              disabled={loadingCavalos}
            >
              <option value="">{loadingCavalos ? "Carregando..." : "Selecionar cavalo..."}</option>
              {cavalos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {/* Horário */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Horário</label>
            <div className="grid grid-cols-4 gap-1.5">
              {HORARIOS_BASE.map(hora => {
                const ocupado = occupiedTimes.includes(hora);
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

          <button
            type="button"
            onClick={handleSave}
            disabled={createSessao.isPending || meusAlunos.length === 0}
            className="w-full h-14 rounded-full bg-[#4E593F] hover:bg-[#3E4732] text-white font-bold text-lg mt-4 shadow-lg shadow-[#4E593F]/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {createSessao.isPending ? "Agendando..." : "Agendar Sessão"}
          </button>
        </div>
      </ActionSheet>
    </div>
  );
};
