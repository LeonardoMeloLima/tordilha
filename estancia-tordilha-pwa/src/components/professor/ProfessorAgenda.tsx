import { useState, useMemo, useEffect } from "react";
import { /* WifiOff, */ Clock, Play, Calendar as CalendarIcon, Repeat } from "lucide-react";
import { useSessoes } from "@/hooks/useSessoes";
import { useAlunos } from "@/hooks/useAlunos";
import { useCavalos } from "@/hooks/useCavalos";
import { useSessoesRecorrentes, DIAS_SEMANA } from "@/hooks/useSessoesRecorrentes";
import { useRoleSession } from "@/hooks/supabase/useRoleSession";
import { useToast } from "@/components/ui/use-toast";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { Button } from "@/components/ui/button";
import { format, addDays, parseISO, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { mergeDiaSessoes } from "@/lib/recorrentes";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { usePendentesByAlvo } from "@/hooks/useSolicitacoes";
import { useCriarSolicitacao } from "@/hooks/useCriarSolicitacao";
import { PendenteBadge } from "@/components/shared/PendenteBadge";
import { ModalSugerirHorario } from "@/components/shared/ModalSugerirHorario";
import { ModalPropoeRecorrencia } from "@/components/shared/ModalPropoeRecorrencia";
import { toast as sonnerToast } from "sonner";

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
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [diaSemana, setDiaSemana] = useState<number>(1); // padrão segunda
  const [showRecorrencias, setShowRecorrencias] = useState(false);
  const [sugerirRec, setSugerirRec] = useState<{ open: boolean; recorrencia?: any }>({ open: false });
  const [sugerirSes, setSugerirSes] = useState<{ open: boolean; sessao?: any }>({ open: false });
  const [showPropoeRec, setShowPropoeRec] = useState(false);

  // Só os praticantes atribuídos a este terapeuta podem ser agendados por ele.
  const meusAlunos = useMemo(() => {
    if (!userId) return [];
    return alunos.filter(a => a.professor_id === userId);
  }, [alunos, userId]);

  const meusAlunoIds = useMemo(() => meusAlunos.map(a => a.id), [meusAlunos]);

  // Recorrências dos MEUS praticantes (pra view "Recorrências" e pra "propor mudança")
  const { recorrentes, createRecorrente } = useSessoesRecorrentes(meusAlunoIds);

  // Solicitações pendentes — pra refletir nos cards + bloquear "propor mudança" duplicada
  const { byAlvo: pendentesByAlvo } = usePendentesByAlvo();
  const criarSol = useCriarSolicitacao();

  const daySessoes = useMemo(() => {
    // Combina sessões reais + recorrências expandidas (mesma lógica de
    // Gestor/Pais, agora centralizada). Antes a agenda do terapeuta só lia
    // `sessoes` reais — e como recorrências não viram sessão concreta no banco,
    // o terapeuta não via NADA mesmo após a família aprovar. Mantém o filtro
    // de "concluida" que já existia aqui (sessões virtuais têm status
    // "recorrente", então passam).
    return mergeDiaSessoes(sessoes, recorrentes, parseISO(selectedDay))
      .filter((s) => s.status !== "concluida");
  }, [sessoes, recorrentes, selectedDay]);

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
      if (isRecorrente) {
        // Guarda contra duplicata (UX): já existe recorrência ativa pro mesmo
        // praticante nesse dia+horário? Avisa antes de tentar criar. O banco
        // tem um índice único (uniq_recorrencia_ativa) como rede de segurança,
        // mas avisar aqui dá uma mensagem melhor que o erro cru de constraint.
        const jaExiste = recorrentes.some(
          (r: any) =>
            r.aluno_id === newSession.alunoId &&
            r.dia_semana === diaSemana &&
            r.horario?.slice(0, 5) === newSession.hora?.slice(0, 5)
        );
        if (jaExiste) {
          toast({
            variant: "destructive",
            title: "Atendimento já existe",
            description: "Esse praticante já tem um atendimento recorrente nesse dia e horário.",
          });
          return;
        }
        // Atendimento recorrente NOVO: criado direto pelo terapeuta, sem
        // aprovação da família (autoridade clínica — mesma lógica da sessão
        // pontual abaixo). A aprovação bilateral foi removida para o sentido
        // terapeuta→família por gerar fricção (recorrências ficavam paradas).
        // Mudança/remarcação de recorrência existente CONTINUA pedindo aval.
        await createRecorrente.mutateAsync({
          aluno_id: newSession.alunoId,
          cavalo_id: newSession.cavaloId,
          dia_semana: diaSemana,
          horario: newSession.hora,
          professor_id: userId,
          ativo: true,
        });
        sonnerToast.success("Atendimento recorrente criado!");
      } else {
        // Sessão pontual: criada direto (terapeuta tem autoridade clínica).
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
      }
      setShowForm(false);
      setIsRecorrente(false);
      setNewSession({ alunoId: "", cavaloId: "", hora: "08:00" });
    } catch (error: any) {
      // 23505 = unique_violation do índice uniq_recorrencia_ativa (rede de
      // segurança do banco contra duplicata, caso a guarda UX acima escape).
      const msg = error?.code === "23505"
        ? "Esse praticante já tem um atendimento recorrente nesse dia e horário."
        : error?.message === "DUPLICATE_PENDING"
        ? "Já existe uma proposta pendente similar."
        : error?.message ?? "Erro desconhecido";
      toast({ variant: "destructive", title: "Erro", description: msg });
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

      {/* Toggle: sessões do dia vs view de recorrências */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {showRecorrencias ? "Recorrências dos meus praticantes" : "Sessões do dia"}
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

      {showRecorrencias ? (
        <div className="space-y-3">
          <Button
            type="button"
            className="w-full"
            onClick={() => setShowPropoeRec(true)}
            disabled={meusAlunos.length === 0}
          >
            <Repeat size={14} className="mr-2" />
            Propor novo atendimento recorrente pro praticante
          </Button>

          {recorrentes.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
              <Repeat size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Nenhuma recorrência cadastrada</p>
            </div>
          ) : recorrentes.map((r) => {
            const pendenteRec = pendentesByAlvo.get(r.id);
            const podePropor = !pendenteRec || pendenteRec.tipo !== "mudanca_recorrencia";
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
                <div className="flex items-center justify-end gap-2 px-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!podePropor}
                    onClick={() => setSugerirRec({ open: true, recorrencia: r })}
                  >
                    {!podePropor ? "Mudança pendente" : "Sugerir novo horário"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
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
            daySessoes.map((s) => {
              const pendenteSes = pendentesByAlvo.get(s.id);
              const podeRemarcar = !pendenteSes || pendenteSes.tipo !== "remarcacao_sessao";
              return (
                <div key={s.id} className="space-y-2">
                  <div className="bg-card rounded-3xl card-shadow p-5 transition-all active:scale-[0.98]">
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
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 text-sm font-black text-slate-900 bg-slate-50 px-3 py-1.5 rounded-full">
                          <Clock size={14} className="text-[#4E593F]" strokeWidth={2.5} />
                          {format(parseISO(s.data_hora), "HH:mm")}
                        </div>
                        <PendenteBadge solicitacao={pendenteSes} />
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
                  <div className="flex items-center justify-end gap-2 px-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!podeRemarcar}
                      onClick={() => setSugerirSes({ open: true, sessao: s })}
                    >
                      {!podeRemarcar ? "Remarcação pendente" : "Remarcar (com aviso)"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============ Form modal de criar sessão (apenas terapeuta, sem recorrente) ============ */}
      <ActionSheet
        isOpen={showForm}
        onClose={() => { setShowForm(false); setIsRecorrente(false); }}
        title={isRecorrente ? "Novo atendimento recorrente" : "Nova Sessão"}
        subtitle={isRecorrente
          ? "Será criado para o praticante (toda semana no dia/horário escolhido)"
          : `Para ${format(parseISO(selectedDay), "EEEE, d 'de' MMMM", { locale: ptBR })}`}
      >
        <div className="space-y-5 py-2">
          {/* Toggle Recorrência */}
          <button
            type="button"
            onClick={() => setIsRecorrente(v => !v)}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
              isRecorrente ? "border-[#4E593F] bg-[#4E593F]/5" : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <Repeat size={18} className={isRecorrente ? "text-[#4E593F]" : "text-slate-400"} />
              <div className="text-left">
                <p className={`text-sm font-bold ${isRecorrente ? "text-[#4E593F]" : "text-slate-700"}`}>
                  Atendimento Recorrente
                </p>
                <p className="text-[11px] text-slate-500">
                  {isRecorrente ? "Toda semana, pendente de aprovação" : "Ex: toda terça às 10h"}
                </p>
              </div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${isRecorrente ? "bg-[#4E593F]" : "bg-slate-200"} flex items-center px-1`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isRecorrente ? "translate-x-4" : "translate-x-0"}`} />
            </div>
          </button>

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

          {/* Dia da semana — só em recorrente */}
          {isRecorrente && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Dia da semana</label>
              <div className="grid grid-cols-4 gap-1.5">
                {DIAS_SEMANA.map(d => {
                  const selected = diaSemana === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDiaSemana(d.value)}
                      className={`h-11 rounded-xl font-bold text-xs transition-all border-2 ${selected
                        ? "bg-[#4E593F] border-[#4E593F] text-white shadow-md"
                        : "bg-slate-50 border-transparent text-slate-600 hover:border-slate-200"
                        }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Horário */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Horário</label>
            <div className="grid grid-cols-4 gap-1.5">
              {HORARIOS_BASE.map(hora => {
                // Slots ocupados só fazem sentido pra sessão pontual no dia selecionado.
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

          <button
            type="button"
            onClick={handleSave}
            disabled={createSessao.isPending || createRecorrente.isPending || meusAlunos.length === 0}
            className="w-full h-14 rounded-full bg-[#4E593F] hover:bg-[#3E4732] text-white font-bold text-lg mt-4 shadow-lg shadow-[#4E593F]/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {createSessao.isPending || createRecorrente.isPending
              ? (isRecorrente ? "Criando..." : "Agendando...")
              : (isRecorrente ? "Criar atendimento recorrente" : "Agendar Sessão")}
          </button>
        </div>
      </ActionSheet>

      {/* Modal: propor mudança de horário em recorrência existente */}
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
              sonnerToast.success("Proposta enviada ao responsável.");
            } catch (e: any) {
              sonnerToast.error(e?.message === "DUPLICATE_PENDING"
                ? "Já existe uma solicitação pendente nesse horário."
                : "Erro ao enviar solicitação.");
            }
          }}
        />
      )}

      {/* Modal: propor remarcação de sessão pontual */}
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
              sonnerToast.success("Proposta enviada ao responsável.");
            } catch (e: any) {
              sonnerToast.error(e?.message === "DUPLICATE_PENDING"
                ? "Já existe uma solicitação pendente."
                : "Erro ao enviar solicitação.");
            }
          }}
        />
      )}

      {/* Modal: propor NOVA aula recorrente pra um dos meus praticantes */}
      <ModalPropoeRecorrencia
        open={showPropoeRec}
        onClose={() => setShowPropoeRec(false)}
        alunoOptions={meusAlunos.map(a => ({ id: a.id, nome: a.nome }))}
        onSubmit={async (data) => {
          try {
            // Recorrência NOVA criada direto (sem aprovação da família). O
            // cavalo é opcional aqui (definido depois na agenda) — este modal
            // não coleta cavalo.
            await createRecorrente.mutateAsync({
              aluno_id: data.aluno_id,
              cavalo_id: null,
              dia_semana: data.dia_semana,
              horario: data.horario,
              professor_id: userId,
              ativo: true,
            });
            sonnerToast.success("Atendimento recorrente criado!");
          } catch (e: any) {
            sonnerToast.error(e?.code === "23505"
              ? "Esse praticante já tem atendimento recorrente nesse dia e horário."
              : "Erro ao criar atendimento recorrente.");
          }
        }}
      />
    </div>
  );
};
