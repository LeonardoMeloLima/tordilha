import { useState, useEffect, useMemo } from "react";
import { WifiOff, Clock, Play, Calendar as CalendarIcon, Check, Repeat } from "lucide-react";
import { useSessoes } from "@/hooks/useSessoes";
import { useSessoesRecorrentes, DIAS_SEMANA } from "@/hooks/useSessoesRecorrentes";
import { useAlunos } from "@/hooks/useAlunos";
import { useCavalos } from "@/hooks/useCavalos";
import { usePropostasHorario } from "@/hooks/usePropostasHorario";
import { ActionSheet } from "../ui/ActionSheet";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { format, addDays, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";
import { HORARIOS_BASE, sessionEndTime } from "@/lib/scheduling";

export const ProfessorAgenda = () => {
  const { toast } = useToast();
  const { sessoes, isLoading } = useSessoes();
  const { alunos } = useAlunos();
  const { cavalos } = useCavalos();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const meusAlunos = useMemo(
    () => alunos.filter(a => a.professor_id === currentUserId),
    [alunos, currentUserId]
  );

  const { propostas, criarProposta } = usePropostasHorario(
    currentUserId ? { terapeutaId: currentUserId } : undefined
  );

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
  const [form, setForm] = useState({ alunoId: "", cavaloId: "", diaSemana: 1, horario: "08:00" });

  useEffect(() => {
    const handler = () => setShowForm(true);
    window.addEventListener('fab-click-local', handler);
    return () => window.removeEventListener('fab-click-local', handler);
  }, []);

  const daySessoes = useMemo(() => {
    return sessoes
      .filter(s => isSameDay(parseISO(s.data_hora), parseISO(selectedDay)) && s.status !== "concluida")
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  }, [sessoes, selectedDay]);

  // Blocked slots: existing proposals from this terapeuta with status aguardando
  const blockedSlots = useMemo(() =>
    propostas.map(p => `${p.dia_semana}-${p.horario?.slice(0, 5)}`),
    [propostas]
  );

  const handleSave = async () => {
    if (!form.alunoId) {
      toast({ variant: "destructive", title: "Selecione um praticante." });
      return;
    }
    const slotKey = `${form.diaSemana}-${form.horario}`;
    if (blockedSlots.includes(slotKey)) {
      toast({ variant: "destructive", title: "Horário já proposto", description: "Já existe uma proposta pendente para este dia e horário." });
      return;
    }
    try {
      await criarProposta.mutateAsync({
        aluno_id: form.alunoId,
        dia_semana: form.diaSemana,
        horario: form.horario,
        cavalo_id: form.cavaloId || null,
      });
      toast({ title: "Proposta enviada!", description: "O responsável receberá a notificação." });
      setShowForm(false);
      setForm({ alunoId: "", cavaloId: "", diaSemana: 1, horario: "08:00" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
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
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-accent/15 text-accent-foreground text-[10px] font-extrabold">
          <WifiOff size={12} />
          Online
        </div>
      </div>

      {/* Pending proposals banner */}
      {propostas.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
          <p className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <Repeat size={12} />
            Propostas aguardando resposta ({propostas.length})
          </p>
          {propostas.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
              <div>
                <p className="text-sm font-bold text-slate-800">{p.aluno?.nome}</p>
                <p className="text-xs text-slate-400">
                  {DIAS_SEMANA.find(d => d.value === p.dia_semana)?.label} às {p.horario?.slice(0, 5)} – {sessionEndTime(p.horario?.slice(0, 5) ?? "08:00")}
                  {p.cavalo ? ` · ${p.cavalo.nome}` : ""}
                </p>
              </div>
              <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                Pendente
              </span>
            </div>
          ))}
        </div>
      )}

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
                <AvatarWithFallback src={s.aluno?.avatar_url} className="w-14 h-14 rounded-2xl" type="user" />
                <div className="flex-1">
                  <p className="text-base font-bold text-slate-900">{s.aluno?.nome}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    c/ {s.cavalo?.nome} · {s.aluno?.diagnostico || "Avaliação"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-black text-slate-900 bg-slate-50 px-3 py-1.5 rounded-full">
                  <Clock size={14} className="text-[#4E593F]" strokeWidth={2.5} />
                  {format(parseISO(s.data_hora), "HH:mm")} – {sessionEndTime(format(parseISO(s.data_hora), "HH:mm"))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('iniciar-sessao', { detail: { sessaoId: s.id } }))}
                className="w-full mt-4 py-4 bg-[#4E593F] text-white rounded-[20px] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#4E593F]/20 active:scale-[0.97] transition-all"
              >
                <Play size={16} fill="white" />
                Iniciar Sessão
              </button>
            </div>
          ))
        )}
      </div>

      {/* Propor Horário ActionSheet */}
      <ActionSheet
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Propor Horário"
        subtitle="O responsável escolherá o melhor dia"
        footer={
          <button
            type="button"
            onClick={handleSave}
            disabled={criarProposta.isPending}
            className="w-full h-14 bg-[#4E593F] text-white rounded-full font-bold text-lg shadow-lg shadow-[#4E593F]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {criarProposta.isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={20} strokeWidth={2.5} />
            )}
            Enviar Proposta
          </button>
        }
      >
        <div className="space-y-5">
          {/* Praticante */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Praticante</label>
            <select
              value={form.alunoId}
              onChange={e => setForm({ ...form, alunoId: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] outline-none"
            >
              <option value="">Selecionar praticante...</option>
              {meusAlunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>

          {/* Dia da semana */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Dia da Semana</label>
            <div className="flex gap-1.5 flex-wrap">
              {DIAS_SEMANA.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setForm({ ...form, diaSemana: d.value })}
                  className={`h-10 px-3 rounded-xl font-bold text-sm transition-all ${form.diaSemana === d.value
                    ? "bg-[#4E593F] text-white"
                    : "bg-slate-100 text-slate-600"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Horário */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Horário</label>
            <div className="grid grid-cols-4 gap-1.5">
              {HORARIOS_BASE.map(hora => {
                const blocked = blockedSlots.includes(`${form.diaSemana}-${hora}`);
                return (
                  <button
                    key={hora}
                    type="button"
                    disabled={blocked}
                    onClick={() => setForm({ ...form, horario: hora })}
                    className={`h-11 rounded-xl font-bold text-xs transition-all border-2 ${form.horario === hora
                      ? "bg-[#4E593F] border-[#4E593F] text-white shadow-md"
                      : blocked
                        ? "bg-slate-100 border-transparent text-slate-300 cursor-not-allowed opacity-50"
                        : "bg-slate-50 border-transparent text-slate-600"}`}
                  >
                    {hora}
                    {blocked && <div className="text-[7px] leading-none">proposto</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cavalo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Cavalo <span className="text-slate-400 text-xs">(opcional)</span></label>
            <select
              value={form.cavaloId}
              onChange={e => setForm({ ...form, cavaloId: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#4E593F] outline-none"
            >
              <option value="">Selecionar cavalo (opcional)...</option>
              {cavalos.filter(c => c.status === 'Ativo').map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>
      </ActionSheet>
    </div>
  );
};
