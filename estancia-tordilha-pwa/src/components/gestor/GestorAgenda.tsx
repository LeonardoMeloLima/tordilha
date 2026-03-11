import { useState, useEffect, useMemo } from "react";
import { Clock, Check, Calendar as CalendarIcon } from "lucide-react";
import { ActionSheet } from "../ui/ActionSheet";
import { useToast } from "@/components/ui/use-toast";
import { useSessoes } from "@/hooks/useSessoes";
import { useAlunos } from "@/hooks/useAlunos";
import { useCavalos } from "@/hooks/useCavalos";
import { format, addDays, parseISO, isSameDay, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SwipeableCard } from "../ui/SwipeableCard";
import { AvatarWithFallback } from "@/components/ui/AvatarWithFallback";

export const GestorAgenda = () => {
  const { toast } = useToast();
  const { sessoes, isLoading: loadingSessoes, createSessao, deleteSessao } = useSessoes();
  const { alunos, isLoading: loadingAlunos } = useAlunos();
  const { cavalos, isLoading: loadingCavalos } = useCavalos();

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

  const daySessoes = useMemo(() => {
    return sessoes.filter((s) => isSameDay(parseISO(s.data_hora), parseISO(selectedDay)));
  }, [sessoes, selectedDay]);

  useEffect(() => {
    const handleOpenForm = () => setShowForm(true);
    window.addEventListener('open-form-sessao', handleOpenForm);
    return () => window.removeEventListener('open-form-sessao', handleOpenForm);
  }, []);

  const handleSave = async () => {
    if (!newSession.alunoId || !newSession.cavaloId) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione um aluno e um cavalo." });
      return;
    }

    try {
      const [hours, minutes] = newSession.hora.split(':').map(Number);
      const selectedDateTime = parseISO(selectedDay);
      selectedDateTime.setHours(hours, minutes, 0, 0);

      // Validation: Prevent scheduling in the past
      if (isBefore(selectedDateTime, new Date())) {
        toast({
          variant: "destructive",
          title: "Horário Inválido",
          description: "Não é possível agendar sessões no passado."
        });
        return;
      }

      const data_hora = selectedDateTime.toISOString();
      await createSessao.mutateAsync({
        aluno_id: newSession.alunoId,
        cavalo_id: newSession.cavaloId,
        data_hora: data_hora,
        status: "confirmada"
      });

      setShowForm(false);
      setNewSession({ alunoId: "", cavaloId: "", hora: "08:00" });
      toast({ title: "Sucesso", description: "Sessão agendada com sucesso!" });
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

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Agenda</h1>
        <p className="text-sm text-muted-foreground font-medium mt-0.5">
          {format(new Date(), "MMMM yyyy", { locale: ptBR })}
        </p>
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

      {/* Sessions */}
      <div className="space-y-3">
        {loadingSessoes ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm font-medium">Carregando sessões...</p>
          </div>
        ) : daySessoes.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
            <CalendarIcon size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Nenhuma sessão neste dia</p>
          </div>
        ) : (
          daySessoes.map((s) => (
            <SwipeableCard
              key={s.id}
              onDelete={() => handleDelete(s.id)}
              deleteLabel="Excluir"
            >
              <div className="flex items-center gap-4 p-5 bg-card rounded-3xl card-shadow group transition-all active:scale-[0.99]">
                <div className="w-12 h-12 rounded-2xl bg-[#EAB308]/10 flex items-center justify-center">
                  <AvatarWithFallback
                    src={s.aluno?.avatar_url}
                    className="w-10 h-10 rounded-xl"
                    type="user"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{s.aluno?.nome || "Aluno não encontrado"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
                    </div>
                    <p className="text-[11px] text-muted-foreground font-bold">{s.cavalo?.nome || "Sem cavalo"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                    <Clock size={14} className="text-[#EAB308]" strokeWidth={2.5} />
                    {format(parseISO(s.data_hora), "HH:mm")}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${s.status === "confirmada" ? "text-[#EAB308]" : "text-muted-foreground"}`}>
                    {s.status}
                  </span>
                </div>
              </div>
            </SwipeableCard>
          ))
        )}
      </div>

      {/* New Session Form (Action Sheet) */}
      <ActionSheet
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Agendar Sessão"
        subtitle={`Para o dia ${selectedDay.split('-').reverse().join('/')}`}
        footer={
          <button
            type="button"
            onClick={handleSave}
            disabled={createSessao.isPending}
            className="w-full h-14 bg-[#EAB308] hover:bg-[#D97706] text-white rounded-full font-bold text-lg shadow-lg shadow-[#EAB308]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {createSessao.isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={20} className="text-white" strokeWidth={2.5} />
            )}
            {createSessao.isPending ? "Agendando..." : "Confirmar Agendamento"}
          </button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Aluno</label>
            <select
              value={newSession.alunoId}
              onChange={(e) => setNewSession({ ...newSession, alunoId: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] outline-none transition-all shadow-sm focus:bg-white disabled:opacity-50"
              disabled={loadingAlunos}
            >
              <option value="">{loadingAlunos ? "Carregando alunos..." : "Selecionar aluno..."}</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Cavalo</label>
            <select
              value={newSession.cavaloId}
              onChange={(e) => setNewSession({ ...newSession, cavaloId: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] outline-none transition-all shadow-sm focus:bg-white disabled:opacity-50"
              disabled={loadingCavalos}
            >
              <option value="">{loadingCavalos ? "Carregando cavalos..." : "Selecionar cavalo..."}</option>
              {cavalos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 ml-1">Horário</label>
            <input
              type="time"
              value={newSession.hora}
              onChange={(e) => setNewSession({ ...newSession, hora: e.target.value })}
              className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-medium focus:ring-2 focus:ring-[#EAB308] focus:border-[#EAB308] outline-none transition-all shadow-sm focus:bg-white"
            />
          </div>

        </div>
      </ActionSheet>
    </div>
  );
};

